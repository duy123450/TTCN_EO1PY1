import pool from '../config/db.js'

const shiftSelect = `
    SELECT shift_id, employee_id, work_date, start_time, end_time,
           shift_status, created_at
    FROM shifts
`

const sendDatabaseError = (res, message, error) => {
    console.error(`${message}:`, error.message)
    return res.status(500).json({ success: false, message })
}

const rollback = async (connection) => {
    try {
        await connection.rollback()
    } catch (error) {
        console.error('Shift transaction rollback error:', error.message)
    }
}

const resolveEmployeeId = async (database, userId) => {
    const [employees] = await database.execute(
        `SELECT e.employee_id
         FROM employees e
         INNER JOIN users u ON u.user_id = e.user_id
         WHERE u.user_id = ?
         LIMIT 1`,
        [userId],
    )

    return employees[0]?.employee_id ?? null
}

const getEmployeeForUpdate = async (connection, employeeId) => {
    const [employees] = await connection.execute(
        `SELECT e.employee_id, e.employment_status, u.account_status
         FROM employees e
         INNER JOIN users u ON u.user_id = e.user_id
         WHERE e.employee_id = ?
         FOR UPDATE`,
        [employeeId],
    )

    return employees[0] ?? null
}

const findOverlappingShift = async (
    connection,
    { employeeId, workDate, startTime, endTime, excludedShiftId },
) => {
    const excludedShiftClause =
        excludedShiftId == null ? '' : 'AND shift_id <> ?'
    const params = [employeeId, workDate, endTime, startTime]
    if (excludedShiftId != null) {
        params.push(excludedShiftId)
    }

    const [shifts] = await connection.execute(
        `SELECT shift_id
         FROM shifts
         WHERE employee_id = ?
           AND work_date = ?
           AND shift_status <> 'CANCELLED'
           AND start_time < ?
           AND end_time > ?
           ${excludedShiftClause}
         LIMIT 1
         FOR UPDATE`,
        params,
    )

    return shifts.length > 0
}

const getShifts = async (req, res) => {
    const {
        week_start: weekStart,
        week_end: weekEnd,
        employee_id: employeeIdFilter,
    } = req.validated.query

    const where = ['work_date BETWEEN ? AND ?']
    const params = [weekStart, weekEnd]

    if (req.user.role === 'MANAGER') {
        if (employeeIdFilter !== undefined) {
            where.push('employee_id = ?')
            params.push(employeeIdFilter)
        }
    } else {
        try {
            const employeeId = await resolveEmployeeId(pool, req.user.user_id)
            if (employeeId == null) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee record not found',
                })
            }
            where.push('employee_id = ?', "shift_status = 'PUBLISHED'")
            params.push(employeeId)
        } catch (error) {
            return sendDatabaseError(res, 'Failed to retrieve shifts', error)
        }
    }

    try {
        const [shifts] = await pool.execute(
            `${shiftSelect}
             WHERE ${where.join(' AND ')}
             ORDER BY work_date, start_time, shift_id`,
            params,
        )

        return res.json({ success: true, data: shifts })
    } catch (error) {
        return sendDatabaseError(res, 'Failed to retrieve shifts', error)
    }
}

const getShiftById = async (req, res) => {
    const shiftId = req.validated.params.id

    try {
        const params = [shiftId]
        let accessFilter = ''

        if (req.user.role !== 'MANAGER') {
            const employeeId = await resolveEmployeeId(pool, req.user.user_id)
            if (employeeId == null) {
                return res.status(404).json({
                    success: false,
                    message: 'Shift not found',
                })
            }
            accessFilter = `AND employee_id = ? AND shift_status = 'PUBLISHED'`
            params.push(employeeId)
        }

        const [shifts] = await pool.execute(
            `${shiftSelect}
             WHERE shift_id = ? ${accessFilter}`,
            params,
        )

        if (shifts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found',
            })
        }

        return res.json({ success: true, data: shifts[0] })
    } catch (error) {
        return sendDatabaseError(res, 'Failed to retrieve shift', error)
    }
}

const createShift = async (req, res) => {
    const {
        employee_id: employeeId,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
    } = req.validated.body

    let connection
    let transactionStarted = false

    try {
        connection = await pool.getConnection()
        await connection.beginTransaction()
        transactionStarted = true

        const employee = await getEmployeeForUpdate(connection, employeeId)
        if (!employee) {
            await rollback(connection)
            transactionStarted = false
            return res.status(404).json({
                success: false,
                message: 'Employee not found',
            })
        }
        if (
            employee.employment_status !== 'ACTIVE' ||
            employee.account_status !== 'ACTIVE'
        ) {
            await rollback(connection)
            transactionStarted = false
            return res.status(400).json({
                success: false,
                message: 'Shifts can only be assigned to active employees',
            })
        }

        const overlaps = await findOverlappingShift(connection, {
            employeeId,
            workDate,
            startTime,
            endTime,
        })
        if (overlaps) {
            await rollback(connection)
            transactionStarted = false
            return res.status(409).json({
                success: false,
                message: 'The shift overlaps an existing non-cancelled shift',
            })
        }

        const [result] = await connection.execute(
            `INSERT INTO shifts
                (employee_id, work_date, start_time, end_time, shift_status)
             VALUES (?, ?, ?, ?, 'DRAFT')`,
            [employeeId, workDate, startTime, endTime],
        )

        const [shifts] = await connection.execute(
            `${shiftSelect} WHERE shift_id = ?`,
            [result.insertId],
        )

        await connection.commit()
        transactionStarted = false

        return res.status(201).json({ success: true, data: shifts[0] })
    } catch (error) {
        if (connection && transactionStarted) {
            await rollback(connection)
        }
        return sendDatabaseError(res, 'Failed to create shift', error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

const updateShift = async (req, res) => {
    const shiftId = req.validated.params.id
    const {
        employee_id: employeeId,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
    } = req.validated.body

    let connection
    let transactionStarted = false

    try {
        connection = await pool.getConnection()
        await connection.beginTransaction()
        transactionStarted = true

        const [initialShifts] = await connection.execute(
            'SELECT employee_id FROM shifts WHERE shift_id = ?',
            [shiftId],
        )
        if (initialShifts.length === 0) {
            await rollback(connection)
            transactionStarted = false
            return res.status(404).json({
                success: false,
                message: 'Shift not found',
            })
        }

        const initialEmployeeId = initialShifts[0].employee_id
        const employeeIds = [...new Set([initialEmployeeId, employeeId])].sort(
            (left, right) => left - right,
        )
        const placeholders = employeeIds.map(() => '?').join(', ')
        const [employees] = await connection.execute(
            `SELECT e.employee_id, e.employment_status, u.account_status
             FROM employees e
             INNER JOIN users u ON u.user_id = e.user_id
             WHERE e.employee_id IN (${placeholders})
             ORDER BY e.employee_id
             FOR UPDATE`,
            employeeIds,
        )

        const targetEmployee = employees.find(
            (employee) => employee.employee_id === employeeId,
        )
        if (!targetEmployee) {
            await rollback(connection)
            transactionStarted = false
            return res.status(404).json({
                success: false,
                message: 'Employee not found',
            })
        }
        if (
            targetEmployee.employment_status !== 'ACTIVE' ||
            targetEmployee.account_status !== 'ACTIVE'
        ) {
            await rollback(connection)
            transactionStarted = false
            return res.status(400).json({
                success: false,
                message: 'Shifts can only be assigned to active employees',
            })
        }

        const [currentShifts] = await connection.execute(
            `${shiftSelect} WHERE shift_id = ? FOR UPDATE`,
            [shiftId],
        )
        if (currentShifts.length === 0) {
            await rollback(connection)
            transactionStarted = false
            return res.status(404).json({
                success: false,
                message: 'Shift not found',
            })
        }
        if (currentShifts[0].employee_id !== initialEmployeeId) {
            await rollback(connection)
            transactionStarted = false
            return res.status(409).json({
                success: false,
                message: 'The shift changed while being edited. Please reload and try again.',
            })
        }

        const overlaps = await findOverlappingShift(connection, {
            employeeId,
            workDate,
            startTime,
            endTime,
            excludedShiftId: shiftId,
        })
        if (overlaps) {
            await rollback(connection)
            transactionStarted = false
            return res.status(409).json({
                success: false,
                message: 'The shift overlaps an existing non-cancelled shift',
            })
        }

        await connection.execute(
            `UPDATE shifts
             SET employee_id = ?, work_date = ?, start_time = ?, end_time = ?
             WHERE shift_id = ?`,
            [employeeId, workDate, startTime, endTime, shiftId],
        )
        const [updatedShifts] = await connection.execute(
            `${shiftSelect} WHERE shift_id = ?`,
            [shiftId],
        )

        await connection.commit()
        transactionStarted = false

        return res.json({ success: true, data: updatedShifts[0] })
    } catch (error) {
        if (connection && transactionStarted) {
            await rollback(connection)
        }
        return sendDatabaseError(res, 'Failed to update shift', error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

const publishShifts = async (req, res) => {
    const {
        week_start: weekStart,
        week_end: weekEnd,
    } = req.validated.body

    let connection
    let transactionStarted = false

    try {
        connection = await pool.getConnection()
        await connection.beginTransaction()
        transactionStarted = true

        const [result] = await connection.execute(
            `UPDATE shifts
             SET shift_status = 'PUBLISHED'
             WHERE work_date BETWEEN ? AND ?
               AND shift_status = 'DRAFT'`,
            [weekStart, weekEnd],
        )

        await connection.commit()
        transactionStarted = false

        return res.json({
            success: true,
            data: { published_count: result.affectedRows },
        })
    } catch (error) {
        if (connection && transactionStarted) {
            await rollback(connection)
        }
        return sendDatabaseError(res, 'Failed to publish shifts', error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

const cancelShift = async (req, res) => {
    const shiftId = req.validated.params.id

    let connection
    let transactionStarted = false

    try {
        connection = await pool.getConnection()
        await connection.beginTransaction()
        transactionStarted = true

        const [shifts] = await connection.execute(
            `${shiftSelect} WHERE shift_id = ? FOR UPDATE`,
            [shiftId],
        )
        if (shifts.length === 0) {
            await rollback(connection)
            transactionStarted = false
            return res.status(404).json({
                success: false,
                message: 'Shift not found',
            })
        }

        await connection.execute(
            `UPDATE shifts SET shift_status = 'CANCELLED' WHERE shift_id = ?`,
            [shiftId],
        )
        const [cancelledShifts] = await connection.execute(
            `${shiftSelect} WHERE shift_id = ?`,
            [shiftId],
        )

        await connection.commit()
        transactionStarted = false

        return res.json({ success: true, data: cancelledShifts[0] })
    } catch (error) {
        if (connection && transactionStarted) {
            await rollback(connection)
        }
        return sendDatabaseError(res, 'Failed to cancel shift', error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

export {
    getShifts,
    getShiftById,
    createShift,
    updateShift,
    publishShifts,
    cancelShift,
}
