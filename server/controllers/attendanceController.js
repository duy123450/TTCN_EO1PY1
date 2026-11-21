import pool from '../config/db.js'

const attendanceFields = `
    attendance_id, employee_id, shift_id, check_in, check_out,
    working_minutes, attendance_status, note
`

const sendDatabaseError = (res, message, error) => {
    console.error(`${message}:`, error.message)
    return res.status(500).json({ success: false, message })
}

const rollback = async (connection) => {
    try {
        await connection.rollback()
    } catch (error) {
        console.error('Attendance transaction rollback error:', error.message)
    }
}

const resolveEmployeeId = async (database, userId, lock = false) => {
    const lockClause = lock ? 'FOR UPDATE' : ''
    const [employees] = await database.execute(
        `SELECT e.employee_id
         FROM users u
         INNER JOIN employees e ON e.user_id = u.user_id
         WHERE u.user_id = ?
         LIMIT 1
         ${lockClause}`,
        [userId],
    )

    return employees[0]?.employee_id ?? null
}

const getAttendanceById = async (connection, attendanceId) => {
    const [records] = await connection.execute(
        `SELECT ${attendanceFields}
         FROM attendance
         WHERE attendance_id = ?`,
        [attendanceId],
    )

    return records[0] ?? null
}

const isOpenAttendanceSignal = (error) =>
    (error?.code === 'ER_SIGNAL_EXCEPTION' || error?.errno === 1644) &&
    error?.sqlMessage?.includes(
        'Employee already has an open attendance record',
    )

const checkIn = async (req, res) => {
    const { shift_id: shiftId } = req.validated.body
    let connection
    let transactionStarted = false

    try {
        connection = await pool.getConnection()
        await connection.beginTransaction()
        transactionStarted = true

        const employeeId = await resolveEmployeeId(
            connection,
            req.user.user_id,
            true,
        )
        if (employeeId == null) {
            await rollback(connection)
            transactionStarted = false
            return res.status(404).json({
                success: false,
                message: 'Employee record not found',
            })
        }

        const [shifts] = await connection.execute(
            `SELECT shift_id, employee_id, shift_status
             FROM shifts
             WHERE shift_id = ?
             FOR UPDATE`,
            [shiftId],
        )
        const shift = shifts[0]
        if (!shift || shift.employee_id !== employeeId) {
            await rollback(connection)
            transactionStarted = false
            return res.status(404).json({
                success: false,
                message: 'Shift not found',
            })
        }
        if (shift.shift_status !== 'PUBLISHED') {
            await rollback(connection)
            transactionStarted = false
            return res.status(409).json({
                success: false,
                message: 'Check-in requires a published shift',
            })
        }

        const [openRecords] = await connection.execute(
            `SELECT attendance_id
             FROM attendance
             WHERE employee_id = ? AND check_out IS NULL
             LIMIT 1
             FOR UPDATE`,
            [employeeId],
        )
        if (openRecords.length > 0) {
            await rollback(connection)
            transactionStarted = false
            return res.status(409).json({
                success: false,
                message: 'You already have an open attendance session',
            })
        }

        const [insertResult] = await connection.execute(
            `INSERT INTO attendance
                (employee_id, shift_id, check_in, attendance_status)
             VALUES (?, ?, CURRENT_TIMESTAMP, 'INCOMPLETE')`,
            [employeeId, shiftId],
        )
        const attendance = await getAttendanceById(
            connection,
            insertResult.insertId,
        )

        await connection.commit()
        transactionStarted = false

        return res.status(201).json({ success: true, data: attendance })
    } catch (error) {
        if (connection && transactionStarted) {
            await rollback(connection)
        }
        if (isOpenAttendanceSignal(error)) {
            return res.status(409).json({
                success: false,
                message: 'You already have an open attendance session',
            })
        }
        return sendDatabaseError(res, 'Failed to record attendance check-in', error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

const checkOut = async (req, res) => {
    let connection
    let transactionStarted = false

    try {
        connection = await pool.getConnection()
        await connection.beginTransaction()
        transactionStarted = true

        const employeeId = await resolveEmployeeId(
            connection,
            req.user.user_id,
            true,
        )
        if (employeeId == null) {
            await rollback(connection)
            transactionStarted = false
            return res.status(404).json({
                success: false,
                message: 'Employee record not found',
            })
        }

        const [openRecords] = await connection.execute(
            `SELECT attendance_id, check_in
             FROM attendance
             WHERE employee_id = ? AND check_out IS NULL
             ORDER BY attendance_id DESC
             LIMIT 1
             FOR UPDATE`,
            [employeeId],
        )
        const openRecord = openRecords[0]
        if (!openRecord) {
            await rollback(connection)
            transactionStarted = false
            return res.status(409).json({
                success: false,
                message: 'There is no open attendance session to check out',
            })
        }

        const [updateResult] = await connection.execute(
            `UPDATE attendance
             SET check_out = CURRENT_TIMESTAMP,
                 working_minutes = FLOOR(
                     TIMESTAMPDIFF(SECOND, check_in, CURRENT_TIMESTAMP) / 60
                 ),
                 attendance_status = 'VALID'
             WHERE attendance_id = ?
               AND check_out IS NULL
               AND check_in < CURRENT_TIMESTAMP`,
            [openRecord.attendance_id],
        )
        if (updateResult.affectedRows !== 1) {
            await rollback(connection)
            transactionStarted = false
            return res.status(409).json({
                success: false,
                message: 'Check-out time must be later than check-in',
            })
        }

        const attendance = await getAttendanceById(
            connection,
            openRecord.attendance_id,
        )
        await connection.commit()
        transactionStarted = false

        return res.json({ success: true, data: attendance })
    } catch (error) {
        if (connection && transactionStarted) {
            await rollback(connection)
        }
        return sendDatabaseError(res, 'Failed to record attendance check-out', error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

const getAttendance = async (req, res) => {
    const {
        start_date: startDate,
        end_date: endDate,
        employee_id: employeeIdFilter,
    } = req.validated.query
    const conditions = []
    const params = []

    try {
        if (req.user.role === 'EMPLOYEE') {
            const employeeId = await resolveEmployeeId(pool, req.user.user_id)
            if (employeeId == null) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee record not found',
                })
            }
            conditions.push('employee_id = ?')
            params.push(employeeId)
        } else if (employeeIdFilter !== undefined) {
            conditions.push('employee_id = ?')
            params.push(employeeIdFilter)
        }

        if (startDate !== undefined) {
            conditions.push('DATE(check_in) >= ?')
            params.push(startDate)
        }
        if (endDate !== undefined) {
            conditions.push('DATE(check_in) <= ?')
            params.push(endDate)
        }

        const whereClause =
            conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        const [records] = await pool.execute(
            `SELECT ${attendanceFields}
             FROM attendance
             ${whereClause}
             ORDER BY check_in DESC, attendance_id DESC`,
            params,
        )

        return res.json({ success: true, data: records })
    } catch (error) {
        return sendDatabaseError(res, 'Failed to retrieve attendance', error)
    }
}

export { checkIn, checkOut, getAttendance }
