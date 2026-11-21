import assert from 'node:assert/strict'
import test from 'node:test'
import pool from '../config/db.js'
import { getAttendance } from './attendanceController.js'

const makeResponse = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code
        return this
    },
    json(body) {
        this.body = body
        return this
    },
})

test('attendance retrieval runs against MySQL and scopes employee results', async (t) => {
    try {
        await pool.query('SELECT 1')
    } catch (error) {
        t.skip(`MySQL is unavailable (${error.code || 'connection error'})`)
        return
    }

    t.after(() => pool.end())

    const managerResponse = makeResponse()
    await getAttendance(
        {
            user: { user_id: 1, role: 'MANAGER' },
            validated: { query: {} },
        },
        managerResponse,
    )

    assert.equal(managerResponse.statusCode, 200)
    assert.equal(managerResponse.body.success, true)
    assert.ok(Array.isArray(managerResponse.body.data))
    for (const record of managerResponse.body.data) {
        assert.deepEqual(Object.keys(record).sort(), [
            'attendance_id',
            'attendance_status',
            'check_in',
            'check_out',
            'employee_id',
            'note',
            'shift_id',
            'working_minutes',
        ])
    }

    const [employees] = await pool.execute(
        `SELECT e.employee_id, e.user_id
         FROM users u
         INNER JOIN employees e ON e.user_id = u.user_id
         ORDER BY e.employee_id
         LIMIT 1`,
    )
    if (employees.length === 0) {
        return
    }

    const employeeResponse = makeResponse()
    await getAttendance(
        {
            user: { user_id: employees[0].user_id, role: 'EMPLOYEE' },
            validated: { query: { employee_id: '2147483647' } },
        },
        employeeResponse,
    )

    assert.equal(employeeResponse.statusCode, 200)
    assert.ok(
        employeeResponse.body.data.every(
            (record) => record.employee_id === employees[0].employee_id,
        ),
    )
})
