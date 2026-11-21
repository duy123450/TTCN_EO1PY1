import assert from 'node:assert/strict'
import test from 'node:test'
import pool from '../config/db.js'
import { checkIn, checkOut, getAttendance } from './attendanceController.js'

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

const makeConnection = ({
    employeeId = 12,
    shift = { shift_id: 4, employee_id: 12, shift_status: 'PUBLISHED' },
    openRecord = null,
} = {}) => {
    const state = {
        employeeId,
        shift,
        openRecord: openRecord ? { ...openRecord } : null,
        records: [],
        nextId: 1,
        committed: false,
        rolledBack: false,
        released: false,
        statements: [],
    }

    const connection = {
        async beginTransaction() {},
        async commit() {
            state.committed = true
        },
        async rollback() {
            state.rolledBack = true
        },
        release() {
            state.released = true
        },
        async execute(sql, params = []) {
            const statement = sql.replace(/\s+/g, ' ').trim().toLowerCase()
            state.statements.push({ statement, params })

            if (statement.startsWith('select e.employee_id from users')) {
                return [state.employeeId == null ? [] : [{ employee_id: state.employeeId }]]
            }
            if (statement.startsWith('select shift_id, employee_id, shift_status from shifts')) {
                return [
                    state.shift && state.shift.shift_id === params[0]
                        ? [{ ...state.shift }]
                        : [],
                ]
            }
            if (statement.startsWith('select attendance_id from attendance')) {
                return [
                    state.openRecord && state.openRecord.check_out == null
                        ? [{ attendance_id: state.openRecord.attendance_id }]
                        : [],
                ]
            }
            if (statement.startsWith('insert into attendance')) {
                const record = {
                    attendance_id: state.nextId++,
                    employee_id: params[0],
                    shift_id: params[1],
                    check_in: '2026-11-20 08:00:00',
                    check_out: null,
                    working_minutes: null,
                    attendance_status: 'INCOMPLETE',
                    note: null,
                }
                state.records.push(record)
                state.openRecord = record
                return [{ insertId: record.attendance_id }]
            }
            if (statement.includes('from attendance where attendance_id = ?')) {
                const record = state.records.find(
                    (item) => item.attendance_id === params[0],
                )
                return [record ? [{ ...record }] : []]
            }
            if (statement.startsWith('select attendance_id, check_in from attendance')) {
                return [
                    state.openRecord && state.openRecord.check_out == null
                        ? [{ ...state.openRecord }]
                        : [],
                ]
            }
            if (statement.startsWith('update attendance')) {
                const record = state.records.find(
                    (item) => item.attendance_id === params[0],
                )
                if (!record || record.check_out != null) {
                    return [{ affectedRows: 0 }]
                }
                record.check_out = '2026-11-20 08:01:59'
                record.working_minutes = 1
                record.attendance_status = 'VALID'
                state.openRecord = null
                return [{ affectedRows: 1 }]
            }

            throw new Error(`Unexpected SQL in attendance test: ${statement}`)
        },
    }

    return { connection, state }
}

const mockConnection = (t, connection) => {
    t.mock.method(pool, 'getConnection', async () => connection)
}

const employeeRequest = (overrides = {}) => ({
    user: { user_id: 101, role: 'EMPLOYEE' },
    validated: { body: { shift_id: 4 }, query: {} },
    ...overrides,
})

test('check-in creates an incomplete record using the authenticated employee and server time', async (t) => {
    const { connection, state } = makeConnection()
    mockConnection(t, connection)
    const response = makeResponse()

    await checkIn(employeeRequest(), response)

    assert.equal(response.statusCode, 201)
    assert.deepEqual(response.body.data, {
        attendance_id: 1,
        employee_id: 12,
        shift_id: 4,
        check_in: '2026-11-20 08:00:00',
        check_out: null,
        working_minutes: null,
        attendance_status: 'INCOMPLETE',
        note: null,
    })
    const insert = state.statements.find((entry) =>
        entry.statement.startsWith('insert into attendance'),
    )
    assert.match(insert.statement, /current_timestamp/)
    assert.deepEqual(insert.params, [12, 4])
    assert.equal(state.committed, true)
    assert.equal(state.released, true)
})

test('check-in rejects another employee’s shift without inserting attendance', async (t) => {
    const { connection, state } = makeConnection({
        shift: { shift_id: 4, employee_id: 99, shift_status: 'PUBLISHED' },
    })
    mockConnection(t, connection)
    const response = makeResponse()

    await checkIn(employeeRequest(), response)

    assert.equal(response.statusCode, 404)
    assert.equal(state.records.length, 0)
    assert.equal(state.rolledBack, true)
})

test('check-in rejects draft and cancelled shifts', async (t) => {
    for (const status of ['DRAFT', 'CANCELLED']) {
        const { connection, state } = makeConnection({
            shift: { shift_id: 4, employee_id: 12, shift_status: status },
        })
        mockConnection(t, connection)
        const response = makeResponse()

        await checkIn(employeeRequest(), response)

        assert.equal(response.statusCode, 409)
        assert.equal(state.records.length, 0)
        assert.equal(state.rolledBack, true)
        t.mock.restoreAll()
    }
})

test('check-in rejects an existing open session', async (t) => {
    const { connection, state } = makeConnection({
        openRecord: {
            attendance_id: 31,
            employee_id: 12,
            check_in: '2026-11-20 07:00:00',
            check_out: null,
        },
    })
    mockConnection(t, connection)
    const response = makeResponse()

    await checkIn(employeeRequest(), response)

    assert.equal(response.statusCode, 409)
    assert.equal(state.records.length, 0)
    assert.equal(state.rolledBack, true)
})

test('check-out stores server time, floors elapsed full minutes, and sets VALID', async (t) => {
    const { connection, state } = makeConnection({
        openRecord: {
            attendance_id: 19,
            employee_id: 12,
            shift_id: 4,
            check_in: '2026-11-20 08:00:00',
            check_out: null,
            working_minutes: null,
            attendance_status: 'INCOMPLETE',
            note: null,
        },
    })
    state.records.push(state.openRecord)
    mockConnection(t, connection)
    const response = makeResponse()

    await checkOut({
        user: { user_id: 101, role: 'EMPLOYEE' },
        validated: { body: {} },
    }, response)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.check_out, '2026-11-20 08:01:59')
    assert.equal(response.body.data.working_minutes, 1)
    assert.equal(response.body.data.attendance_status, 'VALID')
    const update = state.statements.find((entry) =>
        entry.statement.startsWith('update attendance'),
    )
    assert.match(update.statement, /floor\(\s*timestampdiff\(second/)
    assert.match(update.statement, /current_timestamp/)
    assert.equal(state.committed, true)
})

test('check-out without an open session and duplicate check-out are rejected', async (t) => {
    const { connection } = makeConnection()
    mockConnection(t, connection)
    const request = {
        user: { user_id: 101, role: 'EMPLOYEE' },
        validated: { body: {} },
    }
    const noOpenResponse = makeResponse()

    await checkOut(request, noOpenResponse)
    assert.equal(noOpenResponse.statusCode, 409)

    const { connection: secondConnection, state } = makeConnection({
        openRecord: {
            attendance_id: 20,
            employee_id: 12,
            shift_id: 4,
            check_in: '2026-11-20 08:00:00',
            check_out: null,
            working_minutes: null,
            attendance_status: 'INCOMPLETE',
            note: null,
        },
    })
    state.records.push(state.openRecord)
    t.mock.restoreAll()
    mockConnection(t, secondConnection)
    const firstCheckout = makeResponse()
    await checkOut(request, firstCheckout)
    const duplicateCheckout = makeResponse()
    await checkOut(request, duplicateCheckout)

    assert.equal(firstCheckout.statusCode, 200)
    assert.equal(duplicateCheckout.statusCode, 409)
})

test('employee retrieval ignores a supplied employee ID and scopes results to the authenticated user', async (t) => {
    const statements = []
    t.mock.method(pool, 'execute', async (sql, params) => {
        const statement = sql.replace(/\s+/g, ' ').trim().toLowerCase()
        statements.push({ statement, params })
        if (statement.startsWith('select e.employee_id from users')) {
            return [[{ employee_id: 12 }]]
        }
        return [[{ attendance_id: 8, employee_id: 12 }]]
    })
    const response = makeResponse()

    await getAttendance({
        user: { user_id: 101, role: 'EMPLOYEE' },
        validated: {
            query: {
                employee_id: '999',
                start_date: '2026-11-01',
                end_date: '2026-11-30',
            },
        },
    }, response)

    const listing = statements[1]
    assert.equal(response.statusCode, 200)
    assert.match(listing.statement, /employee_id = \?/)
    assert.deepEqual(listing.params, [12, '2026-11-01', '2026-11-30'])
    assert.equal(listing.params.includes('999'), false)
})

test('manager retrieval supports unfiltered and employee-filtered attendance', async (t) => {
    const statements = []
    t.mock.method(pool, 'execute', async (sql, params) => {
        statements.push({
            statement: sql.replace(/\s+/g, ' ').trim().toLowerCase(),
            params,
        })
        return [[]]
    })

    const allResponse = makeResponse()
    await getAttendance({
        user: { user_id: 201, role: 'MANAGER' },
        validated: { query: {} },
    }, allResponse)
    assert.equal(statements[0].statement.includes('where'), false)
    assert.deepEqual(statements[0].params, [])

    const filteredResponse = makeResponse()
    await getAttendance({
        user: { user_id: 201, role: 'MANAGER' },
        validated: { query: { employee_id: 12, start_date: '2026-11-20' } },
    }, filteredResponse)
    assert.match(statements[1].statement, /employee_id = \?/)
    assert.match(statements[1].statement, /date\(check_in\) >= \?/)
    assert.deepEqual(statements[1].params, [12, '2026-11-20'])
})
