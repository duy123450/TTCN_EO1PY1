import pool from '../config/db.js'

const isValidDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false
    }

    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(0)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCFullYear(year, month - 1, day)

    return date.toISOString().slice(0, 10) === value
}

const toPositiveId = (value) => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? value : null
    }

    if (
        typeof value !== 'string' ||
        !/^\d+$/.test(value) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) <= 0
    ) {
        return null
    }

    return Number(value)
}

const normalizeTime = (value) => {
    if (typeof value !== 'string') {
        return null
    }

    const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
    return match ? `${match[1]}:${match[2]}:${match[3] ?? '00'}` : null
}

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

const validateAvailability = (entries) => {
    if (!Array.isArray(entries)) {
        return { error: 'availability must be an array' }
    }

    const normalized = []
    const intervalsByDay = new Map()
    const offDays = new Set()
    const allowedFields = new Set([
        'day_of_week',
        'start_time',
        'end_time',
        'is_off',
    ])

    for (const entry of entries) {
        if (
            !entry ||
            typeof entry !== 'object' ||
            Array.isArray(entry) ||
            Object.keys(entry).some((field) => !allowedFields.has(field)) ||
            !Object.hasOwn(entry, 'day_of_week') ||
            !Object.hasOwn(entry, 'is_off')
        ) {
            return { error: 'Each availability entry must contain valid fields only' }
        }

        const { day_of_week: dayOfWeek, is_off: isOff } = entry
        if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
            return { error: 'day_of_week must be an integer from 1 to 7' }
        }
        if (typeof isOff !== 'boolean') {
            return { error: 'is_off must be a boolean' }
        }

        if (isOff) {
            if (
                !Object.hasOwn(entry, 'start_time') ||
                !Object.hasOwn(entry, 'end_time') ||
                entry.start_time !== null ||
                entry.end_time !== null
            ) {
                return { error: 'Off-day start_time and end_time must be null' }
            }
            if (offDays.has(dayOfWeek) || intervalsByDay.has(dayOfWeek)) {
                return { error: 'An off day cannot contain other entries' }
            }
            offDays.add(dayOfWeek)
            normalized.push({
                day_of_week: dayOfWeek,
                start_time: null,
                end_time: null,
                is_off: true,
            })
            continue
        }

        if (offDays.has(dayOfWeek)) {
            return { error: 'An off day cannot contain working intervals' }
        }

        const startTime = normalizeTime(entry.start_time)
        const endTime = normalizeTime(entry.end_time)
        if (startTime === null || endTime === null || endTime <= startTime) {
            return {
                error: 'Availability requires valid times with end_time later than start_time',
            }
        }

        const intervals = intervalsByDay.get(dayOfWeek) ?? []
        intervals.push({ start_time: startTime, end_time: endTime })
        intervalsByDay.set(dayOfWeek, intervals)
        normalized.push({
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            is_off: false,
        })
    }

    for (const intervals of intervalsByDay.values()) {
        intervals.sort((left, right) =>
            left.start_time.localeCompare(right.start_time),
        )
        for (let index = 1; index < intervals.length; index += 1) {
            if (intervals[index].start_time < intervals[index - 1].end_time) {
                return { error: 'Availability intervals on a day cannot overlap' }
            }
        }
    }

    return { records: normalized }
}

const getAvailability = async (req, res) => {
    const { week_start: weekStart } = req.query
    if (!isValidDate(weekStart)) {
        return res.status(400).json({
            success: false,
            message: 'A valid week_start date is required',
        })
    }

    const where = ['week_start = ?']
    const params = [weekStart]

    if (req.user.role === 'MANAGER') {
        if (req.query.employee_id !== undefined) {
            const employeeId = toPositiveId(req.query.employee_id)
            if (employeeId === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid employee ID',
                })
            }
            where.push('employee_id = ?')
            params.push(employeeId)
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
    const body = req.body
    if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).some(
            (field) => !['week_start', 'availability'].includes(field),
        ) ||
        !isValidDate(body.week_start)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Provide a valid week_start and availability array only',
        })
    }

    const validation = validateAvailability(body.availability)
    if (validation.error) {
        return res.status(400).json({
            success: false,
            message: validation.error,
        })
    }

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
            [employeeId, body.week_start],
        )

        if (validation.records.length > 0) {
            const valueGroups = validation.records.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')
            const values = validation.records.flatMap((record) => [
                employeeId,
                body.week_start,
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
            [employeeId, body.week_start],
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
