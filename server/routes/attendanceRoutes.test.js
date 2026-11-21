import assert from 'node:assert/strict'
import test from 'node:test'
import express from 'express'
import jwt from 'jsonwebtoken'
import { getJwtConfig } from '../config/jwt.js'
import attendanceRoutes from './attendanceRoutes.js'

const makeToken = (role) => {
    const config = getJwtConfig()
    return jwt.sign(
        {
            user_id: 901,
            username: 'attendance-route-test',
            role,
            token_type: 'access',
        },
        config.accessSecret,
        { algorithm: 'HS256', expiresIn: '5m' },
    )
}

const startTestServer = async (t) => {
    const app = express()
    app.use(express.json())
    app.use('/api/attendance', attendanceRoutes)
    const server = app.listen(0, '127.0.0.1')
    await new Promise((resolve, reject) => {
        server.once('listening', resolve)
        server.once('error', reject)
    })
    t.after(
        () =>
            new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve())),
            ),
    )
    return `http://127.0.0.1:${server.address().port}`
}

test('attendance routes require authentication', async (t) => {
    const baseUrl = await startTestServer(t)
    const response = await fetch(`${baseUrl}/api/attendance`)
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), {
        success: false,
        message: 'Authentication token is required',
    })
})

test('manager cannot call employee-only check-in and check-out routes', async (t) => {
    const token = makeToken('MANAGER')
    const baseUrl = await startTestServer(t)
    for (const path of ['/check-in', '/check-out']) {
        const response = await fetch(`${baseUrl}/api/attendance${path}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(path === '/check-in' ? { shift_id: 1 } : {}),
        })
        assert.equal(response.status, 403)
        assert.deepEqual(await response.json(), {
            success: false,
            message: 'Insufficient permissions',
        })
    }
})

test('attendance routes reject invalid bodies and date filters before accessing the database', async (t) => {
    const employeeToken = makeToken('EMPLOYEE')
    const managerToken = makeToken('MANAGER')
    const baseUrl = await startTestServer(t)
    const invalidCheckIn = await fetch(
        `${baseUrl}/api/attendance/check-in`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${employeeToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ shift_id: 0 }),
        },
    )
    assert.equal(invalidCheckIn.status, 400)
    assert.deepEqual(await invalidCheckIn.json(), {
        success: false,
        message: 'Invalid attendance check-in data',
    })

    const invalidCheckOut = await fetch(
        `${baseUrl}/api/attendance/check-out`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${employeeToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ employee_id: 12 }),
        },
    )
    assert.equal(invalidCheckOut.status, 400)
    assert.deepEqual(await invalidCheckOut.json(), {
        success: false,
        message: 'Check-out does not accept request fields',
    })

    const invalidDate = await fetch(
        `${baseUrl}/api/attendance?start_date=2026-02-29`,
        { headers: { Authorization: `Bearer ${managerToken}` } },
    )
    assert.equal(invalidDate.status, 400)
    assert.deepEqual(await invalidDate.json(), {
        success: false,
        message: 'Invalid attendance filters',
    })
})
