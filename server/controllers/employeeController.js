import bcrypt from 'bcryptjs'
import pool from '../config/db.js'

const employeeSelect = `
    SELECT e.employee_id, e.user_id, e.full_name, e.phone, e.date_of_birth,
           e.employee_type, e.start_date, e.employment_status,
           e.probation_status, u.username, u.account_status
    FROM employees e
    INNER JOIN users u ON u.user_id = e.user_id
`

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
    try {
        const [employees] = await pool.execute(
            `${employeeSelect} WHERE e.employee_id = ?`,
            [req.validated.params.id]
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
    const body = req.validated.body
    const {
        username,
        password,
        full_name: fullName,
        phone,
        date_of_birth: dateOfBirth = null,
        employee_type: employeeType,
        start_date: startDate
    } = body

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
    const body = req.validated.body
    const submittedFields = Object.keys(body)

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
        const employeeId = req.validated.params.id
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
            [req.validated.params.id]
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
