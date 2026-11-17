
import pool from './config/db.js'
import bcrypt from 'bcryptjs'

const demoUsers = [
    {
        username: 'manager.demo',
        role: 'MANAGER',
        fullName: 'Nguyen Minh Anh',
        phone: '0000000001',
        dateOfBirth: '1995-05-12',
        employeeType: 'FULL_TIME',
        startDate: '2025-01-01'
    },
    {
        username: 'employee.pt1',
        role: 'EMPLOYEE',
        fullName: 'Tran Gia Han',
        phone: '0000000002',
        dateOfBirth: '2001-08-20',
        employeeType: 'PART_TIME',
        startDate: '2026-10-01'
    },
    {
        username: 'employee.pt2',
        role: 'EMPLOYEE',
        fullName: 'Le Hoang Nam',
        phone: '0000000003',
        dateOfBirth: '2002-03-15',
        employeeType: 'PART_TIME',
        startDate: '2026-10-01'
    },
    {
        username: 'employee.ft1',
        role: 'EMPLOYEE',
        fullName: 'Pham Quoc Bao',
        phone: '0000000004',
        dateOfBirth: '1998-11-22',
        employeeType: 'FULL_TIME',
        startDate: '2026-10-01'
    }
]

async function seedDatabase() {
    const connection = await pool.getConnection()

    try {
        const [[userCount]] = await connection.query(
            'SELECT COUNT(*) AS total FROM users'
        )

        const [[employeeCount]] = await connection.query(
            'SELECT COUNT(*) AS total FROM employees'
        )

        if (userCount.total > 0 || employeeCount.total > 0) {
            throw new Error(
                'Users or employees already exist. Seed cancelled to prevent duplicates.'
            )
        }

        await connection.beginTransaction()

        const passwordHash = await bcrypt.hash('Demo@123', 10)
        const employeeIds = {}

        // 1. Create users and employee profiles
        for (const user of demoUsers) {
            const [userResult] = await connection.execute(
                `INSERT INTO users
                    (username, password_hash, role, account_status, created_at, updated_at)
                 VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())`,
                [user.username, passwordHash, user.role]
            )

            const [employeeResult] = await connection.execute(
                `INSERT INTO employees
                    (user_id, full_name, phone, date_of_birth,
                     employee_type, start_date, employment_status, probation_status)
                 VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 'PASSED')`,
                [
                    userResult.insertId,
                    user.fullName,
                    user.phone,
                    user.dateOfBirth,
                    user.employeeType,
                    user.startDate
                ]
            )

            employeeIds[user.username] = employeeResult.insertId
        }

        // 2. Create salary configurations
        await connection.execute(
            `INSERT INTO salary_configs
                (employee_type, hourly_rate, probation_hourly_rate,
                 effective_from, effective_to)
             VALUES
                ('PART_TIME', 23000, 20000, '2026-01-01', NULL),
                ('FULL_TIME', 25000, 20000, '2026-01-01', NULL)`
        )

        // 3. Create sample shifts for November 16, 2026
        const demoShifts = [
            {
                username: 'employee.pt1',
                start: '08:00:00',
                end: '12:00:00',
                checkIn: '08:03:00',
                checkOut: '12:00:00',
                minutes: 237
            },
            {
                username: 'employee.pt2',
                start: '12:00:00',
                end: '16:00:00',
                checkIn: '12:00:00',
                checkOut: '16:05:00',
                minutes: 245
            },
            {
                username: 'employee.ft1',
                start: '08:00:00',
                end: '16:00:00',
                checkIn: '08:00:00',
                checkOut: '16:00:00',
                minutes: 480
            }
        ]

        for (const shift of demoShifts) {
            const employeeId = employeeIds[shift.username]

            const [shiftResult] = await connection.execute(
                `INSERT INTO shifts
                    (employee_id, work_date, start_time, end_time,
                     shift_status, created_at)
                 VALUES (?, '2026-11-16', ?, ?, 'PUBLISHED', NOW())`,
                [employeeId, shift.start, shift.end]
            )

            // 4. Create attendance records
            const checkIn = `2026-11-16 ${shift.checkIn}`
            const checkOut = `2026-11-16 ${shift.checkOut}`

            await connection.execute(
                `INSERT INTO attendance
                    (employee_id, shift_id, check_in, check_out,
                     working_minutes, attendance_status, note)
                 VALUES (?, ?, ?, ?, ?, 'VALID', 'Demo attendance record')`,
                [
                    employeeId,
                    shiftResult.insertId,
                    checkIn,
                    checkOut,
                    shift.minutes
                ]
            )
        }

        await connection.commit()

        console.log('Demo data inserted successfully!')
        console.log('Created 4 users and employees')
        console.log('Created 2 salary configurations')
        console.log('Created 3 shifts and attendance records')
    } catch (error) {
        await connection.rollback()
        console.error('Seed failed:', error.message)
    } finally {
        connection.release()
        await pool.end()
    }
}

seedDatabase()
