import bcrypt from 'bcryptjs'
import pool from '../config/db.js'

const employeeSelect = `
    SELECT e.employee_id, e.user_id, e.full_name, e.phone, e.date_of_birth,
           e.employee_type, e.start_date, e.employment_status,
           e.probation_status, u.username, u.account_status
    FROM employees e
    INNER JOIN users u ON u.user_id = e.user_id
`

const employeeTypes = ['PART_TIME', 'FULL_TIME']
const employmentStatuses = ['ACTIVE', 'ON_LEAVE', 'RESIGNED']
const probationStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED']

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

const isNonEmptyString = (value, maxLength) =>
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength

const isValidEmployeeId = (value) =>
    typeof value === 'string' &&
    /^\d+$/.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0

const sendDatabaseError = (res, message, error) => {
    console.error(`${message}:`, error.message)
    return res.status(500).json({
        success: false,
        message
    })
}

const getEmployees = async (req, res) => {
    try {
        const [employees] = await pool.query(
            `${employeeSelect} ORDER BY e.employee_id`
        )

        return res.json({
            success: true,
            data: employees
        })
    } catch (error) {
        return sendDatabaseError(res, 'Failed to retrieve employees', error)
    }
}

const getEmployeeById = async (req, res) => {
    if (!isValidEmployeeId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid employee ID'
        })
    }

    try {
        const [employees] = await pool.execute(
            `${employeeSelect} WHERE e.employee_id = ?`,
            [Number(req.params.id)]
        )

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            })
        }

        return res.json({
            success: true,
            data: employees[0]
        })
    } catch (error) {
        return sendDatabaseError(res, 'Failed to retrieve employee', error)
    }
}

const createEmployee = async (req, res) => {
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid employee data'
        })
    }

    const {
        username,
        password,
        full_name: fullName,
        phone,
        date_of_birth: dateOfBirth = null,
        employee_type: employeeType,
        start_date: startDate
    } = body

    if (
        !isNonEmptyString(username, 50) ||
        typeof password !== 'string' ||
        password.length === 0 ||
        !isNonEmptyString(fullName, 100) ||
        !isNonEmptyString(phone, 15) ||
        (dateOfBirth !== null && !isValidDate(dateOfBirth)) ||
        !employeeTypes.includes(employeeType) ||
        !isValidDate(startDate)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing employee fields'
        })
    }

    const normalizedUsername = username.trim()
    const normalizedName = fullName.trim()
    const normalizedPhone = phone.trim()

    let connection
    let transactionStarted = false

    try {
        const passwordHash = await bcrypt.hash(password, 10)
        connection = await pool.getConnection()
        await connection.beginTransaction()
        transactionStarted = true

        const [existingUsers] = await connection.execute(
            'SELECT user_id FROM users WHERE username = ?',
            [normalizedUsername]
        )

        if (existingUsers.length > 0) {
            await connection.rollback()
            transactionStarted = false
            return res.status(409).json({
                success: false,
                message: 'Username is already in use'
            })
        }

        const [userResult] = await connection.execute(
            `INSERT INTO users (username, password_hash, role, account_status)
             VALUES (?, ?, 'EMPLOYEE', 'ACTIVE')`,
            [normalizedUsername, passwordHash]
        )

        const [employeeResult] = await connection.execute(
            `INSERT INTO employees
                (user_id, full_name, phone, date_of_birth, employee_type,
                 start_date, employment_status, probation_status)
             VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 'IN_PROGRESS')`,
            [
                userResult.insertId,
                normalizedName,
                normalizedPhone,
                dateOfBirth,
                employeeType,
                startDate
            ]
        )

        const [employees] = await connection.execute(
            `${employeeSelect} WHERE e.employee_id = ?`,
            [employeeResult.insertId]
        )

        await connection.commit()
        transactionStarted = false

        return res.status(201).json({
            success: true,
            data: employees[0]
        })
    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback()
            } catch (rollbackError) {
                console.error('Create employee rollback error:', rollbackError.message)
            }
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Username is already in use'
            })
        }

        return sendDatabaseError(res, 'Failed to create employee', error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

const updateEmployee = async (req, res) => {
    if (!isValidEmployeeId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid employee ID'
        })
    }

    const body = req.body
    const allowedFields = [
        'full_name',
        'phone',
        'date_of_birth',
        'employee_type',
        'start_date',
        'employment_status',
        'probation_status'
    ]

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid employee data'
        })
    }

    const submittedFields = Object.keys(body)
    if (
        submittedFields.length === 0 ||
        submittedFields.some((field) => !allowedFields.includes(field))
    ) {
        return res.status(400).json({
            success: false,
            message: 'No editable employee fields provided'
        })
    }

    const validators = {
        full_name: (value) => isNonEmptyString(value, 100),
        phone: (value) => isNonEmptyString(value, 15),
        date_of_birth: (value) => value === null || isValidDate(value),
        employee_type: (value) => employeeTypes.includes(value),
        start_date: isValidDate,
        employment_status: (value) => employmentStatuses.includes(value),
        probation_status: (value) => probationStatuses.includes(value)
    }

    if (submittedFields.some((field) => !validators[field](body[field]))) {
        return res.status(400).json({
            success: false,
            message: 'Invalid employee field value'
        })
    }

    const assignments = []
    const values = []

    for (const field of submittedFields) {
        assignments.push(`${field} = ?`)
        const value = body[field]
        values.push(
            field === 'full_name' || field === 'phone'
                ? value.trim()
                : value
        )
    }

    try {
        const employeeId = Number(req.params.id)
        const [existingEmployees] = await pool.execute(
            'SELECT employee_id FROM employees WHERE employee_id = ?',
            [employeeId]
        )

        if (existingEmployees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            })
        }

        await pool.execute(
            `UPDATE employees SET ${assignments.join(', ')} WHERE employee_id = ?`,
            [...values, employeeId]
        )

        const [employees] = await pool.execute(
            `${employeeSelect} WHERE e.employee_id = ?`,
            [employeeId]
        )

        return res.json({
            success: true,
            data: employees[0]
        })
    } catch (error) {
        return sendDatabaseError(res, 'Failed to update employee', error)
    }
}

const deleteEmployee = async (req, res) => {
    if (!isValidEmployeeId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid employee ID'
        })
    }

    let connection
    let transactionStarted = false

    try {
        connection = await pool.getConnection()
        await connection.beginTransaction()
        transactionStarted = true

        const [employees] = await connection.execute(
            `${employeeSelect}
             WHERE e.employee_id = ?
             FOR UPDATE`,
            [Number(req.params.id)]
        )

        if (employees.length === 0) {
            await connection.rollback()
            transactionStarted = false
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            })
        }

        const employee = employees[0]

        await connection.execute(
            'UPDATE employees SET employment_status = ? WHERE employee_id = ?',
            ['RESIGNED', employee.employee_id]
        )
        await connection.execute(
            'UPDATE users SET account_status = ? WHERE user_id = ?',
            ['INACTIVE', employee.user_id]
        )

        await connection.commit()
        transactionStarted = false

        return res.json({
            success: true,
            data: {
                ...employee,
                employment_status: 'RESIGNED',
                account_status: 'INACTIVE'
            }
        })
    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback()
            } catch (rollbackError) {
                console.error('Delete employee rollback error:', rollbackError.message)
            }
        }

        return sendDatabaseError(res, 'Failed to delete employee', error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

export {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
}
