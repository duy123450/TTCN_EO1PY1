import assert from 'node:assert/strict'
import test from 'node:test'
import {
  attendanceCheckInBodySchema,
  attendanceCheckOutBodySchema,
  employeeAttendanceQuerySchema,
  managerAttendanceQuerySchema,
} from './attendanceSchema.js'

test('attendance request schemas match accepted check-in and check-out bodies', () => {
  assert.equal(attendanceCheckInBodySchema.safeParse({ shift_id: '9' }).success, true)
  assert.equal(attendanceCheckInBodySchema.safeParse({ shift_id: '0' }).success, false)
  assert.equal(attendanceCheckInBodySchema.safeParse({ shift_id: 9, employee_id: 1 }).success, false)
  assert.equal(attendanceCheckOutBodySchema.safeParse({}).success, true)
  assert.equal(attendanceCheckOutBodySchema.safeParse({ check_out: 'now' }).success, false)
})

test('attendance query schemas validate dates and manager employee filters', () => {
  assert.equal(
    managerAttendanceQuerySchema.safeParse({
      employee_id: '9',
      start_date: '2026-11-01',
      end_date: '2026-11-30',
    }).success,
    true,
  )
  assert.equal(
    managerAttendanceQuerySchema.safeParse({ employee_id: 'bad' }).success,
    false,
  )
  assert.equal(
    employeeAttendanceQuerySchema.safeParse({
      employee_id: 'ignored',
      start_date: '2026-11-31',
    }).success,
    false,
  )
})
