import pool from '../config/db.js'

const sendDatabaseError = (res, message, error) => {
    console.error(`${message}:`, error.message)
    return res.status(500).json({ success: false, message })
}

const rollback = async (connection) => {
    try {
        await connection.rollback()
    } catch (error) {
        console.error('Availability transaction rollback error:', error.message)
    }
}

const resolveEmployeeId = async (database, userId, lock = false) => {
    const lockClause = lock ? 'FOR UPDATE' : ''
    const [employees] = await database.execute(
        `SELECT e.employee_id
         FROM employees e
         INNER JOIN users u ON u.user_id = e.user_id
         WHERE u.user_id = ?
         ${lockClause}`,
        [userId],
    )

    return employees[0]?.employee_id ?? null
}

const getAvailability = async (req, res) => {
    const {
        week_start: weekStart,
        employee_id: employeeIdFilter,
    } = req.validated.query

    const where = ['week_start = ?']
    const params = [weekStart]

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
            where.push('employee_id = ?')
            params.push(employeeId)
        } catch (error) {
            return sendDatabaseError(
                res,
                'Failed to retrieve availability',
                error,
            )
        }
    }

    try {
        const [records] = await pool.execute(
            `SELECT availability_id, employee_id, week_start, day_of_week,
                    start_time, end_time, is_off
             FROM availability
             WHERE ${where.join(' AND ')}
             ORDER BY employee_id, day_of_week, start_time, availability_id`,
            params,
        )

        return res.json({ success: true, data: records })
    } catch (error) {
        return sendDatabaseError(res, 'Failed to retrieve availability', error)
    }
}

const replaceMyAvailability = async (req, res) => {
    const {
        week_start: weekStart,
        availability: availabilityRecords,
    } = req.validated.body

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

        await connection.execute(
            'DELETE FROM availability WHERE employee_id = ? AND week_start = ?',
            [employeeId, weekStart],
        )

        if (availabilityRecords.length > 0) {
            const valueGroups = availabilityRecords.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')
            const values = availabilityRecords.flatMap((record) => [
                employeeId,
                weekStart,
                record.day_of_week,
                record.start_time,
                record.end_time,
                record.is_off,
            ])
            await connection.execute(
                `INSERT INTO availability
                    (employee_id, week_start, day_of_week, start_time, end_time, is_off)
                 VALUES ${valueGroups}`,
                values,
            )
        }

        const [records] = await connection.execute(
            `SELECT availability_id, employee_id, week_start, day_of_week,
                    start_time, end_time, is_off
             FROM availability
             WHERE employee_id = ? AND week_start = ?
             ORDER BY day_of_week, start_time, availability_id`,
            [employeeId, weekStart],
        )

        await connection.commit()
        transactionStarted = false

        return res.json({ success: true, data: records })
    } catch (error) {
        if (connection && transactionStarted) {
            await rollback(connection)
        }
        return sendDatabaseError(res, 'Failed to save availability', error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

export { getAvailability, replaceMyAvailability }
