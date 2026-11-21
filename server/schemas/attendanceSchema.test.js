import assert from 'node:assert/strict'
import test from 'node:test'
import {
    attendanceCheckInBodySchema,
    attendanceCheckOutBodySchema,
    employeeAttendanceQuerySchema,
    managerAttendanceQuerySchema,
} from './attendanceSchema.js'

test('check-in accepts a positive safe shift ID and rejects invalid or extra fields', () => {
    assert.equal(
        attendanceCheckInBodySchema.safeParse({ shift_id: 12 }).success,
        true,
    )
    assert.equal(
        attendanceCheckInBodySchema.safeParse({ shift_id: '12' }).success,
        true,
    )

    for (const body of [
        {},
        { shift_id: 0 },
        { shift_id: -1 },
        { shift_id: Number.MAX_SAFE_INTEGER + 1 },
        { shift_id: 1, employee_id: 7 },
        { shift_id: 1, check_in: '2026-11-20 08:00:00' },
    ]) {
        assert.equal(attendanceCheckInBodySchema.safeParse(body).success, false)
    }
})

test('check-out only accepts an empty object', () => {
    assert.equal(attendanceCheckOutBodySchema.safeParse({}).success, true)
    for (const body of [
        undefined,
        { employee_id: 1 },
        { check_in: '2026-11-20 08:00:00' },
        { check_out: '2026-11-20 09:00:00' },
        { working_minutes: 60 },
        { attendance_status: 'VALID' },
    ]) {
        assert.equal(attendanceCheckOutBodySchema.safeParse(body).success, false)
    }
})

test('manager attendance filters validate IDs and ordered calendar dates', () => {
    assert.equal(
        managerAttendanceQuerySchema.safeParse({
            employee_id: '7',
            start_date: '2026-11-01',
            end_date: '2026-11-30',
        }).success,
        true,
    )

    for (const query of [
        { employee_id: '0' },
        { employee_id: '7abc' },
        { start_date: '2026-02-29' },
        { start_date: '2026-11-20', end_date: '2026-11-19' },
        { unknown: 'value' },
    ]) {
        assert.equal(managerAttendanceQuerySchema.safeParse(query).success, false)
    }
})

test('employee date filters validate while supplied employee IDs remain untrusted', () => {
    const result = employeeAttendanceQuerySchema.safeParse({
        employee_id: 'another-employee',
        start_date: '2026-11-20',
    })

    assert.equal(result.success, true)
    assert.equal(result.data.employee_id, 'another-employee')
    assert.equal(
        employeeAttendanceQuerySchema.safeParse({
            start_date: '2026-11-20',
            end_date: '2026-11-19',
        }).success,
        false,
    )
})
