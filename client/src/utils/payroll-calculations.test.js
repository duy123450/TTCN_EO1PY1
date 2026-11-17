import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  calculateMonthlyPayroll,
  calculateThirteenthMonthBonus,
  getPayrollPeriod,
} from './payroll-calculations.js'

const config = {
  payday: { dayOfMonth: 5, monthsAfterPayrollPeriod: 1 },
  hourlyRates: {
    PART_TIME: 23000,
    FULL_TIME: 25000,
    probation: 20000,
    probationDurationCalendarDays: 30,
  },
  monthlyReferenceByEmployeeType: {
    PART_TIME: { hours: 104 },
    FULL_TIME: { workingDays: 26 },
  },
  responsibilityBonusByEmployeeType: {
    PART_TIME: 200000,
    FULL_TIME: 400000,
  },
  kpiBonus: {
    minimumMonthlyRevenue: 150000000,
    poolRate: 0.01,
  },
  holidayMultipliers: {
    publicHoliday: 2,
    tet: 3,
  },
  finalRounding: { unitVnd: 1000 },
  thirteenthMonthBonus: {
    minimumSeniorityMonths: 6,
    partialRate: 0.5,
    partialRateMinimumMonths: 6,
    partialRateMaximumMonthsExclusive: 12,
    fullRate: 1,
    fullRateMinimumMonths: 12,
    basisHoursByEmployeeType: {
      PART_TIME: 100,
      FULL_TIME: 200,
    },
    separatePaymentRoundingUnitVnd: 1000,
  },
}

const employee = (overrides = {}) => ({
  employee_id: 1,
  employee_type: 'PART_TIME',
  start_date: '2025-01-01',
  ...overrides,
})

const attendance = (id, employeeId, checkIn, checkOut, overrides = {}) => ({
  attendance_id: id,
  employee_id: employeeId,
  check_in: checkIn,
  check_out: checkOut,
  working_minutes: null,
  ...overrides,
})

const overtime = (employeeId, start, end, overrides = {}) => ({
  employee_id: employeeId,
  request_id: null,
  actual_start_time: start,
  actual_end_time: end,
  actual_minutes: null,
  approval_status: 'APPROVED',
  approved_by: 99,
  approved_at: '2026-03-20 20:00:00',
  ...overrides,
})

const revenue = (payrollMonth, totalRevenue = 0, overrides = {}) => ({
  payroll_month: payrollMonth,
  total_revenue: totalRevenue,
  updated_at: '2026-04-01 09:00:00',
  ...overrides,
})

const holidayCalendar = (overrides = {}) => ({
  year: 2026,
  is_complete: true,
  holidays: [],
  unresolvedLunarRules: [],
  ...overrides,
})

const makeInput = (overrides = {}) => ({
  payrollMonth: '2026-03',
  config: structuredClone(config),
  employees: [employee()],
  employmentRecords: [{ employee_id: 1, employment_end_date: null }],
  attendanceRecords: [],
  hourlyRateRecords: [],
  monthlyRevenueRecords: [revenue('2026-03')],
  approvedOvertimeRecords: [],
  overtimeRequests: [],
  responsibilityViolations: [],
  penaltyRecords: [],
  holidayCalendar: holidayCalendar(),
  ...overrides,
})

const calculate = (overrides = {}) => calculateMonthlyPayroll(makeInput(overrides))

const resultFor = (result, employeeId = 1) => {
  const employeeResult = result.employees.find(
    (record) => record.employeeId === employeeId,
  )
  assert.ok(employeeResult, `expected a payroll result for employee ${employeeId}`)
  return employeeResult
}

const hasWarning = (result, code) =>
  result.warnings.some((warning) => warning.code === code)

describe('employee types, probation, and hourly rates', () => {
  it('uses the confirmed PT and FT hourly rates', () => {
    const result = calculate({
      employees: [
        employee(),
        employee({
          employee_id: 2,
          employee_type: 'FULL_TIME',
        }),
      ],
      employmentRecords: [
        { employee_id: 1, employment_end_date: null },
        { employee_id: 2, employment_end_date: null },
      ],
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
        attendance(2, 2, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
    })

    assert.equal(resultFor(result, 1).regularWorkingPay, 23000)
    assert.equal(resultFor(result, 2).regularWorkingPay, 25000)
  })

  it('uses the probation rate through day 30 and the official rate on day 31', () => {
    const result = calculate({
      employees: [employee({ start_date: '2026-03-01' })],
      attendanceRecords: [
        attendance(1, 1, '2026-03-30 23:00:00', '2026-03-31 01:00:00'),
      ],
    })
    const payroll = resultFor(result)

    assert.equal(payroll.probationPay, 20000)
    assert.equal(payroll.officialRatePay, 23000)
    assert.equal(payroll.actualAttendancePay, 43000)
  })

  it('uses the configured probation rate for full-time employees as well', () => {
    const result = calculate({
      employees: [
        employee({
          employee_type: 'FULL_TIME',
          start_date: '2026-03-01',
        }),
      ],
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
    })

    assert.equal(resultFor(result).probationPay, 20000)
    assert.equal(resultFor(result).officialRatePay, 0)
  })

  it('uses employee-specific effective rates before employee-type rates', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
      hourlyRateRecords: [
        {
          employee_type: 'PART_TIME',
          hourly_rate: 24000,
          effective_from: '2026-01-01',
          effective_to: null,
        },
        {
          employee_id: 1,
          hourly_rate: 26000,
          effective_from: '2026-03-01',
          effective_to: null,
        },
      ],
    })

    assert.equal(resultFor(result).regularWorkingPay, 26000)
  })

  it('warns and withholds a final amount for invalid rate records', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
      hourlyRateRecords: [
        {
          employee_type: 'PART_TIME',
          hourly_rate: 23000,
          effective_from: 'not-a-date',
          effective_to: null,
        },
      ],
    })

    assert.ok(hasWarning(result, 'INVALID_HOURLY_RATE_RECORD'))
    assert.equal(resultFor(result).finalPayableAmount, null)
    assert.equal(resultFor(result).isProvisional, true)
  })

  it('warns and withholds a final amount when overlapping rates conflict', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
      hourlyRateRecords: [
        {
          employee_id: 1,
          hourly_rate: 24000,
          effective_from: '2026-01-01',
          effective_to: null,
        },
        {
          employee_id: 1,
          hourly_rate: 26000,
          effective_from: '2026-03-01',
          effective_to: null,
        },
      ],
    })

    assert.ok(hasWarning(result, 'CONFLICTING_HOURLY_RATES'))
    assert.equal(resultFor(result).finalPayableAmount, null)
  })

  it('warns when duplicate overlapping rate records agree', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
      hourlyRateRecords: [
        {
          employee_id: 1,
          hourly_rate: 26000,
          effective_from: '2026-01-01',
          effective_to: null,
        },
        {
          employee_id: 1,
          hourly_rate: 26000,
          effective_from: '2026-03-01',
          effective_to: null,
        },
      ],
    })

    assert.ok(hasWarning(result, 'DUPLICATE_HOURLY_RATE_RECORDS'))
    assert.equal(resultFor(result).regularWorkingPay, 26000)
  })
})

describe('employment periods and monthly references', () => {
  it('includes an employee employed throughout the month', () => {
    const result = calculate()

    assert.equal(result.employees.length, 1)
    assert.equal(resultFor(result).employmentStatus, 'EMPLOYED_DURING_PERIOD')
    assert.equal(result.kpi.eligibleEmployeeCount, 1)
  })

  it('includes a mid-month hire and excludes pre-employment attendance', () => {
    const result = calculate({
      employees: [employee({ start_date: '2026-03-15' })],
      attendanceRecords: [
        attendance(1, 1, '2026-03-14 10:00:00', '2026-03-14 11:00:00'),
        attendance(2, 1, '2026-03-15 10:00:00', '2026-03-15 11:00:00'),
      ],
    })

    assert.equal(resultFor(result).attendanceMinutes, 60)
    assert.equal(result.kpi.eligibleEmployeeCount, 1)
    assert.ok(hasWarning(result, 'ATTENDANCE_OUTSIDE_EMPLOYMENT_PERIOD'))
  })

  it('includes work on the inclusive employment end date but excludes later work', () => {
    const result = calculate({
      employmentRecords: [
        { employee_id: 1, employment_end_date: '2026-03-15' },
      ],
      attendanceRecords: [
        attendance(1, 1, '2026-03-15 10:00:00', '2026-03-15 12:00:00'),
        attendance(2, 1, '2026-03-16 10:00:00', '2026-03-16 12:00:00'),
      ],
    })

    assert.equal(resultFor(result).attendanceMinutes, 120)
    assert.equal(resultFor(result).employmentEndDate, '2026-03-15')
    assert.ok(hasWarning(result, 'ATTENDANCE_OUTSIDE_EMPLOYMENT_PERIOD'))
  })

  it('clips attendance that partially overlaps both employment boundaries', () => {
    const result = calculate({
      employees: [employee({ start_date: '2026-03-10' })],
      employmentRecords: [
        { employee_id: 1, employment_end_date: '2026-03-20' },
      ],
      attendanceRecords: [
        attendance(1, 1, '2026-03-09 23:00:00', '2026-03-10 01:00:00'),
        attendance(2, 1, '2026-03-20 23:00:00', '2026-03-21 01:00:00'),
      ],
    })

    assert.equal(resultFor(result).attendanceMinutes, 120)
    assert.ok(hasWarning(result, 'ATTENDANCE_OUTSIDE_EMPLOYMENT_PERIOD'))
  })

  it('keeps employees leaving mid-month on the KPI roster', () => {
    const result = calculate({
      employmentRecords: [
        { employee_id: 1, employment_end_date: '2026-03-15' },
      ],
      monthlyRevenueRecords: [revenue('2026-03', 150000000)],
    })

    assert.equal(result.kpi.eligibleEmployeeCount, 1)
    assert.equal(resultFor(result).kpiBonus.amount, 1500000)
  })

  it('excludes overtime outside employment and warns about the record', () => {
    const result = calculate({
      employmentRecords: [
        { employee_id: 1, employment_end_date: '2026-03-15' },
      ],
      approvedOvertimeRecords: [
        overtime(1, '2026-03-16 18:00:00', '2026-03-16 20:00:00'),
      ],
    })

    assert.equal(
      resultFor(result).knownApprovedAdditionalOvertimeMinutes,
      0,
    )
    assert.ok(hasWarning(result, 'OVERTIME_OUTSIDE_EMPLOYMENT_PERIOD'))
  })

  it('marks orphan and missing employment records incomplete', () => {
    const orphan = calculate({
      employmentRecords: [
        { employee_id: 1, employment_end_date: null },
        { employee_id: 99, employment_end_date: null },
      ],
    })
    assert.ok(hasWarning(orphan, 'EMPLOYMENT_RECORD_WITHOUT_EMPLOYEE'))
    assert.equal(orphan.kpi.eligibleEmployeeCount, null)
    assert.equal(orphan.incompleteData, true)

    const missing = calculate({ employmentRecords: [] })
    assert.ok(hasWarning(missing, 'EMPLOYMENT_DATES_INCOMPLETE'))
    assert.equal(missing.employees.length, 0)
    assert.equal(missing.incompleteData, true)
  })

  it('reports the PT hour and FT working-day reference without reducing shortfall pay', () => {
    const result = calculate({
      employees: [
        employee(),
        employee({
          employee_id: 2,
          employee_type: 'FULL_TIME',
        }),
      ],
      employmentRecords: [
        { employee_id: 1, employment_end_date: null },
        { employee_id: 2, employment_end_date: null },
      ],
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 14:00:00'),
        attendance(2, 2, '2026-03-10 10:00:00', '2026-03-10 14:00:00'),
      ],
    })
    const partTime = resultFor(result, 1)
    const fullTime = resultFor(result, 2)

    assert.deepEqual(partTime.minimumMonthlyReference, { hours: 104 })
    assert.deepEqual(fullTime.minimumMonthlyReference, { workingDays: 26 })
    assert.equal(partTime.regularWorkingPay, 92000)
    assert.equal(fullTime.regularWorkingPay, 100000)
    assert.equal(partTime.finalPayableAmount, 292000)
  })
})

describe('attendance and overtime intervals', () => {
  it('prices a normal attendance interval from its timestamps', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 12:00:00', {
          working_minutes: 120,
        }),
      ],
    })

    assert.equal(resultFor(result).attendanceMinutes, 120)
    assert.equal(resultFor(result).actualAttendancePay, 46000)
  })

  it('warns and makes attendance incomplete when check-in is missing', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '', '2026-03-10 12:00:00'),
      ],
    })

    assert.ok(hasWarning(result, 'INVALID_ATTENDANCE_CHECK_IN'))
    assert.equal(resultFor(result).attendanceMinutes, null)
    assert.equal(resultFor(result).finalPayableAmount, null)
  })

  it('warns and makes attendance incomplete when check-out is missing', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', null),
      ],
    })

    assert.ok(hasWarning(result, 'ATTENDANCE_MISSING_CHECK_OUT'))
    assert.equal(resultFor(result).attendanceMinutes, null)
  })

  it('excludes zero-duration and reversed attendance intervals', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 10:00:00'),
        attendance(2, 1, '2026-03-10 12:00:00', '2026-03-10 11:00:00'),
      ],
    })

    assert.ok(hasWarning(result, 'INVALID_ATTENDANCE_INTERVAL'))
    assert.equal(resultFor(result).knownAttendanceMinutes, 0)
    assert.equal(resultFor(result).attendanceMinutes, null)
  })

  it('pays an approved actual overtime record', () => {
    const result = calculate({
      approvedOvertimeRecords: [
        overtime(1, '2026-03-10 18:00:00', '2026-03-10 20:00:00'),
      ],
    })

    assert.equal(
      resultFor(result).approvedAdditionalOvertimeMinutes,
      120,
    )
    assert.equal(resultFor(result).approvedAdditionalOvertimePay, 46000)
  })

  it('excludes invalid, zero-duration, and reversed overtime while merging partial overlaps', () => {
    const result = calculate({
      approvedOvertimeRecords: [
        overtime(1, 'not-a-timestamp', '2026-03-10 20:00:00'),
        overtime(1, '2026-03-10 16:00:00', 'not-a-timestamp'),
        overtime(1, '2026-03-10 16:00:00', '2026-03-10 16:00:00'),
        overtime(1, '2026-03-10 17:00:00', '2026-03-10 16:00:00'),
        overtime(1, '2026-03-10 18:00:00', '2026-03-10 20:00:00'),
        overtime(1, '2026-03-10 19:00:00', '2026-03-10 21:00:00'),
      ],
    })

    assert.ok(hasWarning(result, 'OVERTIME_ACTUAL_START_MISSING'))
    assert.ok(hasWarning(result, 'OVERTIME_ACTUAL_DURATION_INVALID'))
    assert.ok(hasWarning(result, 'OVERLAPPING_OVERTIME_INTERVALS'))
    assert.equal(
      resultFor(result).knownApprovedAdditionalOvertimeMinutes,
      180,
    )
    assert.equal(resultFor(result).approvedAdditionalOvertimeMinutes, null)
  })

  it('uses valid manager-confirmed actual minutes when the end timestamp is invalid', () => {
    const result = calculate({
      approvedOvertimeRecords: [
        overtime(1, '2026-03-10 18:00:00', 'not-a-timestamp', {
          actual_minutes: 90,
        }),
      ],
    })

    assert.ok(hasWarning(result, 'OVERTIME_END_TIMESTAMP_INVALID'))
    assert.equal(
      resultFor(result).approvedAdditionalOvertimeMinutes,
      90,
    )
    assert.equal(resultFor(result).approvedAdditionalOvertimePay, 34500)
  })

  it('does not treat a submitted overtime request as actual work', () => {
    const result = calculate({
      overtimeRequests: [
        {
          request_id: 4,
          employee_id: 1,
          request_type: 'OVERTIME',
          status: 'PENDING',
          start_time: '2026-03-10 18:00:00',
          end_time: '2026-03-10 20:00:00',
        },
      ],
    })

    assert.ok(hasWarning(result, 'OVERTIME_REQUEST_NOT_APPROVED'))
    assert.equal(
      resultFor(result).knownApprovedAdditionalOvertimeMinutes,
      0,
    )
  })

  it('warns when an approved request has no actual overtime record', () => {
    const result = calculate({
      overtimeRequests: [
        {
          request_id: 4,
          employee_id: 1,
          request_type: 'OVERTIME',
          status: 'APPROVED',
          start_time: '2026-03-10 18:00:00',
          end_time: '2026-03-10 20:00:00',
        },
      ],
    })

    assert.ok(hasWarning(result, 'OVERTIME_REQUEST_WITHOUT_ACTUAL_RECORD'))
    assert.equal(
      resultFor(result).knownApprovedAdditionalOvertimeMinutes,
      0,
    )
  })

  it('excludes and warns about unapproved actual overtime', () => {
    const result = calculate({
      approvedOvertimeRecords: [
        overtime(1, '2026-03-10 18:00:00', '2026-03-10 20:00:00', {
          approval_status: 'PENDING',
        }),
      ],
    })

    assert.ok(hasWarning(result, 'OVERTIME_NOT_APPROVED'))
    assert.equal(
      resultFor(result).knownApprovedAdditionalOvertimeMinutes,
      0,
    )
  })

  it('subtracts attendance overlap from approved additional overtime', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 18:00:00', '2026-03-10 20:00:00'),
      ],
      approvedOvertimeRecords: [
        overtime(1, '2026-03-10 19:00:00', '2026-03-10 21:00:00'),
      ],
    })
    const payroll = resultFor(result)

    assert.equal(payroll.attendanceMinutes, 120)
    assert.equal(payroll.approvedAdditionalOvertimeMinutes, 60)
    assert.equal(payroll.totalActualPayableMinutes, 180)
    assert.equal(payroll.actualAttendancePay, 46000)
    assert.equal(payroll.approvedAdditionalOvertimePay, 23000)
    assert.ok(hasWarning(result, 'OVERTIME_ALREADY_IN_ATTENDANCE'))
  })

  it('merges duplicate approved overtime intervals without double payment', () => {
    const result = calculate({
      approvedOvertimeRecords: [
        overtime(1, '2026-03-10 18:00:00', '2026-03-10 20:00:00'),
        overtime(1, '2026-03-10 18:00:00', '2026-03-10 20:00:00'),
      ],
    })

    assert.equal(
      resultFor(result).approvedAdditionalOvertimeMinutes,
      120,
    )
    assert.equal(resultFor(result).approvedAdditionalOvertimePay, 46000)
    assert.ok(hasWarning(result, 'OVERLAPPING_OVERTIME_INTERVALS'))
  })
})

describe('public holidays, Tet, and holiday completeness', () => {
  it('applies the public holiday x2 multiplier', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
      holidayCalendar: holidayCalendar({
        holidays: [
          {
            date: '2026-03-10',
            holiday_name: 'Public holiday',
            holiday_category: 'PUBLIC_HOLIDAY',
            applicable_multiplier: 2,
          },
        ],
      }),
    })

    assert.equal(resultFor(result).actualAttendancePay, 46000)
    assert.equal(resultFor(result).holidayPayBreakdown[0].multiplier, 2)
  })

  it('applies the Tet x3 multiplier', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
      holidayCalendar: holidayCalendar({
        holidays: [
          {
            date: '2026-03-10',
            holiday_name: 'Tet',
            holiday_category: 'TET',
            applicable_multiplier: 3,
          },
        ],
      }),
    })

    assert.equal(resultFor(result).actualAttendancePay, 69000)
    assert.equal(resultFor(result).holidayPayBreakdown[0].multiplier, 3)
  })

  it('applies holiday premiums only to the worked holiday segment', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 23:00:00', '2026-03-11 01:00:00'),
      ],
      holidayCalendar: holidayCalendar({
        holidays: [
          {
            date: '2026-03-10',
            holiday_name: 'Public holiday',
            holiday_category: 'PUBLIC_HOLIDAY',
            applicable_multiplier: 2,
          },
        ],
      }),
    })

    assert.equal(resultFor(result).actualAttendancePay, 69000)
    assert.equal(
      resultFor(result).holidayPayBreakdown[0].attendanceMinutes,
      60,
    )
    assert.equal(resultFor(result).holidayPayBreakdown[0].totalPay, 46000)
  })

  it('does not count the holiday breakdown subtotal twice', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
      holidayCalendar: holidayCalendar({
        holidays: [
          {
            date: '2026-03-10',
            holiday_name: 'Public holiday',
            holiday_category: 'PUBLIC_HOLIDAY',
            applicable_multiplier: 2,
          },
        ],
      }),
    })
    const payroll = resultFor(result)

    assert.equal(payroll.actualAttendancePay, 46000)
    assert.equal(payroll.holidayPayBreakdown[0].totalPay, 46000)
    assert.equal(payroll.grossAmountBeforeDeductions, 246000)
  })

  it('marks only potentially affected months incomplete for unresolved lunar rules', () => {
    const calendar = holidayCalendar({
      is_complete: false,
      incomplete_reason:
        'Gregorian dates for the lunar holidays have not been verified.',
      unresolvedLunarRules: [
        {
          holiday_name: "Hung Kings' Commemoration Day",
          lunar_rule: 'Lunar March 10',
        },
        {
          holiday_name: 'Tet',
          lunar_rule: 'Lunar December 29 through lunar January 3',
        },
      ],
    })
    const forMonth = (payrollMonth) =>
      calculate({
        payrollMonth,
        monthlyRevenueRecords: [revenue(payrollMonth)],
        holidayCalendar: calendar,
      })

    for (const month of ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']) {
      assert.equal(forMonth(month).employees[0].isProvisional, true, month)
    }
    for (const month of ['2026-06', '2026-07', '2026-08']) {
      assert.equal(forMonth(month).employees[0].isProvisional, false, month)
      assert.equal(
        hasWarning(forMonth(month), 'UNRESOLVED_LUNAR_HOLIDAYS'),
        false,
        month,
      )
    }
  })

  it('does not invent a Gregorian holiday date for unresolved lunar rules', () => {
    const result = calculate({
      payrollMonth: '2026-04',
      attendanceRecords: [
        attendance(1, 1, '2026-04-10 10:00:00', '2026-04-10 11:00:00'),
      ],
      monthlyRevenueRecords: [revenue('2026-04')],
      holidayCalendar: holidayCalendar({
        is_complete: false,
        incomplete_reason:
          'Gregorian dates for the lunar holidays have not been verified.',
        unresolvedLunarRules: [
          {
            holiday_name: "Hung Kings' Commemoration Day",
            lunar_rule: 'Lunar March 10',
          },
        ],
      }),
    })

    assert.equal(resultFor(result).actualAttendancePay, 23000)
    assert.deepEqual(resultFor(result).holidayPayBreakdown, [])
    assert.ok(hasWarning(result, 'UNRESOLVED_LUNAR_HOLIDAYS'))
  })

  it('rejects invalid holiday dates and makes payroll provisional', () => {
    const result = calculate({
      holidayCalendar: holidayCalendar({
        holidays: [
          {
            date: '2026-02-30',
            holiday_name: 'Invalid date',
            holiday_category: 'PUBLIC_HOLIDAY',
            applicable_multiplier: 2,
          },
        ],
      }),
    })

    assert.ok(hasWarning(result, 'INVALID_HOLIDAY_RECORD'))
    assert.equal(resultFor(result).isProvisional, true)
  })

  it('does not apply a multiplier when holiday records conflict', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
      holidayCalendar: holidayCalendar({
        holidays: [
          {
            date: '2026-03-10',
            holiday_name: 'Public holiday',
            holiday_category: 'PUBLIC_HOLIDAY',
            applicable_multiplier: 2,
          },
          {
            date: '2026-03-10',
            holiday_name: 'Tet',
            holiday_category: 'TET',
            applicable_multiplier: 3,
          },
        ],
      }),
    })

    assert.ok(hasWarning(result, 'CONFLICTING_HOLIDAY_RECORDS'))
    assert.equal(resultFor(result).actualAttendancePay, null)
    assert.equal(resultFor(result).isProvisional, true)
  })

  it('warns on a holiday calendar year mismatch', () => {
    const result = calculate({
      holidayCalendar: holidayCalendar({ year: 2025 }),
    })

    assert.ok(hasWarning(result, 'HOLIDAY_CALENDAR_YEAR_MISMATCH'))
    assert.equal(resultFor(result).isProvisional, true)
  })
})

describe('responsibility bonus', () => {
  it('uses the confirmed PT and FT responsibility bonus amounts', () => {
    const result = calculate({
      employees: [
        employee(),
        employee({ employee_id: 2, employee_type: 'FULL_TIME' }),
      ],
      employmentRecords: [
        { employee_id: 1, employment_end_date: null },
        { employee_id: 2, employment_end_date: null },
      ],
    })

    assert.equal(resultFor(result, 1).responsibilityBonus.amount, 200000)
    assert.equal(resultFor(result, 2).responsibilityBonus.amount, 400000)
  })

  it('disqualifies the bonus for a qualifying manager-recorded violation', () => {
    const result = calculate({
      responsibilityViolations: [
        {
          employee_id: 1,
          violation_date: '2026-03-20',
          reason: 'Confirmed violation',
          qualifies_for_responsibility_disqualification: true,
          recorded_by: 99,
          recorded_at: '2026-03-20 12:00:00',
        },
      ],
    })

    assert.equal(resultFor(result).responsibilityBonus.eligible, false)
    assert.equal(resultFor(result).responsibilityBonus.amount, 0)
  })

  it('does not disqualify for an explicitly non-qualifying violation', () => {
    const result = calculate({
      responsibilityViolations: [
        {
          employee_id: 1,
          violation_date: '2026-03-20',
          reason: 'Non-qualifying record',
          qualifies_for_responsibility_disqualification: false,
          recorded_by: 99,
          recorded_at: '2026-03-20 12:00:00',
        },
      ],
    })

    assert.equal(resultFor(result).responsibilityBonus.eligible, true)
    assert.equal(resultFor(result).responsibilityBonus.amount, 200000)
  })

  it('does not automatically disqualify for an unapproved violation record', () => {
    const result = calculate({
      responsibilityViolations: [
        {
          employee_id: 1,
          violation_date: '2026-03-20',
          reason: 'Pending review',
          qualifies_for_responsibility_disqualification: true,
          recorded_by: 99,
          recorded_at: '2026-03-20 12:00:00',
          approval_status: 'PENDING',
        },
      ],
    })

    assert.equal(resultFor(result).responsibilityBonus.eligible, null)
    assert.equal(resultFor(result).responsibilityBonus.amount, null)
    assert.ok(hasWarning(result, 'VIOLATION_NOT_APPROVED'))
    assert.equal(resultFor(result).isProvisional, true)
  })

  it('does not award the bonus when violation data is missing', () => {
    const result = calculate({ responsibilityViolations: undefined })

    assert.ok(hasWarning(result, 'SOURCE_MISSING'))
    assert.equal(resultFor(result).responsibilityBonus.amount, null)
    assert.equal(resultFor(result).isProvisional, true)
  })

  it('keeps eligibility unknown for a qualifying record without a manager', () => {
    const result = calculate({
      responsibilityViolations: [
        {
          employee_id: 1,
          violation_date: '2026-03-20',
          reason: 'Manager recorder missing',
          qualifies_for_responsibility_disqualification: true,
          recorded_by: null,
          recorded_at: '2026-03-20 12:00:00',
        },
      ],
    })

    assert.ok(hasWarning(result, 'VIOLATION_MANAGER_MISSING'))
    assert.equal(resultFor(result).responsibilityBonus.eligible, null)
    assert.equal(resultFor(result).responsibilityBonus.amount, null)
  })

  it('keeps eligibility incomplete for a qualifying violation with an invalid date', () => {
    const result = calculate({
      responsibilityViolations: [
        {
          employee_id: 1,
          violation_date: 'not-a-date',
          reason: 'Confirmed violation',
          qualifies_for_responsibility_disqualification: true,
          recorded_by: 99,
          recorded_at: '2026-03-20 12:00:00',
        },
      ],
    })

    assert.ok(hasWarning(result, 'VIOLATION_DATE_INVALID'))
    assert.equal(resultFor(result).responsibilityBonus.eligible, null)
    assert.equal(resultFor(result).responsibilityBonus.amount, null)
  })

  it('keeps eligibility incomplete when a violation has no qualification flag', () => {
    const result = calculate({
      responsibilityViolations: [
        {
          employee_id: 1,
          violation_date: '2026-03-20',
          reason: 'Qualification not recorded',
          recorded_by: 99,
          recorded_at: '2026-03-20 12:00:00',
        },
      ],
    })

    assert.ok(hasWarning(result, 'VIOLATION_QUALIFICATION_MISSING'))
    assert.equal(resultFor(result).responsibilityBonus.eligible, null)
    assert.equal(resultFor(result).responsibilityBonus.amount, null)
  })

  it('does not treat a rejected violation as an approved disqualification', () => {
    const result = calculate({
      responsibilityViolations: [
        {
          employee_id: 1,
          violation_date: '2026-03-20',
          reason: 'Rejected violation',
          qualifies_for_responsibility_disqualification: true,
          recorded_by: 99,
          recorded_at: '2026-03-20 12:00:00',
          approval_status: 'REJECTED',
        },
      ],
    })

    assert.ok(hasWarning(result, 'VIOLATION_NOT_APPROVED'))
    assert.equal(resultFor(result).responsibilityBonus.eligible, null)
    assert.equal(resultFor(result).responsibilityBonus.amount, null)
    assert.deepEqual(
      resultFor(result).responsibilityBonus.qualifyingViolations,
      [],
    )
  })

  it('retains a confirmed disqualification alongside an incomplete pending violation', () => {
    const result = calculate({
      responsibilityViolations: [
        {
          employee_id: 1,
          violation_date: '2026-03-20',
          reason: 'Confirmed violation',
          qualifies_for_responsibility_disqualification: true,
          recorded_by: 99,
          recorded_at: '2026-03-20 12:00:00',
          approval_status: 'APPROVED',
        },
        {
          employee_id: 1,
          violation_date: '2026-03-21',
          reason: 'Pending violation',
          qualifies_for_responsibility_disqualification: true,
          recorded_by: 99,
          recorded_at: '2026-03-21 12:00:00',
          approval_status: 'PENDING',
        },
      ],
    })

    assert.ok(hasWarning(result, 'VIOLATION_NOT_APPROVED'))
    assert.equal(resultFor(result).responsibilityBonus.eligible, false)
    assert.equal(resultFor(result).responsibilityBonus.amount, 0)
    assert.equal(
      resultFor(result).responsibilityBonus.qualifyingViolations.length,
      1,
    )
  })
})

describe('KPI bonus', () => {
  it('applies the threshold and distributes one percent equally', () => {
    const result = calculate({
      employees: [
        employee(),
        employee({ employee_id: 2, employee_type: 'FULL_TIME' }),
      ],
      employmentRecords: [
        { employee_id: 1, employment_end_date: null },
        { employee_id: 2, employment_end_date: null },
      ],
      monthlyRevenueRecords: [revenue('2026-03', 150000000)],
    })

    assert.equal(result.kpi.thresholdReached, true)
    assert.equal(result.kpi.totalPool, 1500000)
    assert.equal(result.kpi.eligibleEmployeeCount, 2)
    assert.equal(result.kpi.perEmployeeShare, 750000)
    assert.equal(resultFor(result, 1).kpiBonus.amount, 750000)
  })

  it('returns a known zero pool below the revenue threshold', () => {
    const result = calculate({
      monthlyRevenueRecords: [revenue('2026-03', 149999999)],
    })

    assert.equal(result.kpi.thresholdReached, false)
    assert.equal(result.kpi.totalPool, 0)
    assert.equal(result.kpi.perEmployeeShare, 0)
    assert.equal(resultFor(result).kpiBonus.amount, 0)
  })

  it('keeps mid-month hires and leavers in the KPI roster', () => {
    const result = calculate({
      employees: [
        employee({ start_date: '2026-03-15' }),
        employee({ employee_id: 2, start_date: '2025-01-01' }),
      ],
      employmentRecords: [
        { employee_id: 1, employment_end_date: null },
        { employee_id: 2, employment_end_date: '2026-03-15' },
      ],
      monthlyRevenueRecords: [revenue('2026-03', 150000000)],
    })

    assert.equal(result.kpi.eligibleEmployeeCount, 2)
    assert.equal(result.kpi.perEmployeeShare, 750000)
  })

  it('distributes the KPI pool to every employee including a mid-month hire and leaver', () => {
    const result = calculate({
      employees: [
        employee({ start_date: '2026-03-15' }),
        employee({ employee_id: 2, start_date: '2025-01-01' }),
        employee({ employee_id: 3, start_date: '2025-01-01' }),
      ],
      employmentRecords: [
        { employee_id: 1, employment_end_date: null },
        { employee_id: 2, employment_end_date: '2026-03-15' },
        { employee_id: 3, employment_end_date: null },
      ],
      monthlyRevenueRecords: [revenue('2026-03', 150000000)],
    })

    assert.equal(result.kpi.eligibleEmployeeCount, 3)
    assert.equal(result.kpi.perEmployeeShare, 500000)
    assert.deepEqual(
      result.employees.map(({ employeeId, kpiBonus }) => [
        employeeId,
        kpiBonus.amount,
      ]),
      [
        [1, 500000],
        [2, 500000],
        [3, 500000],
      ],
    )
  })

  it('does not count duplicate employee IDs twice', () => {
    const result = calculate({
      employees: [employee(), employee()],
      monthlyRevenueRecords: [revenue('2026-03', 150000000)],
    })

    assert.equal(result.kpi.knownEligibleEmployeeCount, 1)
    assert.equal(result.kpi.eligibleEmployeeCount, null)
    assert.ok(hasWarning(result, 'INVALID_EMPLOYEE_RECORD'))
  })

  it('leaves KPI and final pay unavailable when revenue is missing', () => {
    const result = calculate({ monthlyRevenueRecords: [] })
    const payroll = resultFor(result)

    assert.ok(hasWarning(result, 'MONTHLY_REVENUE_MISSING'))
    assert.equal(result.kpi.monthlyRevenue, null)
    assert.equal(payroll.kpiBonus.amount, null)
    assert.equal(payroll.finalPayableAmount, null)
    assert.equal(payroll.isProvisional, true)
  })
})

describe('approved penalties', () => {
  const validPenalty = (overrides = {}) => ({
    employee_id: 1,
    amount: 50000,
    reason: 'Approved policy penalty',
    violation_date: '2026-03-20',
    recorded_by: 99,
    approval_status: 'APPROVED',
    approved_by: 98,
    approved_at: '2026-03-21 09:00:00',
    is_uniform_deduction: false,
    payroll_month: '2026-03',
    ...overrides,
  })

  it('includes only valid approved manager-recorded penalties and retains details', () => {
    const result = calculate({
      penaltyRecords: [validPenalty()],
    })
    const payroll = resultFor(result)
    const [item] = payroll.approvedPenaltyDeductions

    assert.equal(payroll.totalApprovedDeductions, 50000)
    assert.equal(item.reason, 'Approved policy penalty')
    assert.equal(item.recordedBy, 99)
    assert.equal(item.approvedBy, 98)
    assert.equal(item.approvedAt, '2026-03-21 09:00:00')
  })

  it('excludes unapproved penalties', () => {
    const result = calculate({
      penaltyRecords: [validPenalty({ approval_status: 'PENDING' })],
    })

    assert.equal(resultFor(result).totalApprovedDeductions, 0)
    assert.equal(resultFor(result).approvedPenaltyDeductions.length, 0)
    assert.ok(hasWarning(result, 'PENALTY_NOT_APPROVED'))
  })

  it('always excludes uniform deductions', () => {
    const result = calculate({
      penaltyRecords: [validPenalty({ is_uniform_deduction: true })],
    })

    assert.equal(resultFor(result).totalApprovedDeductions, 0)
    assert.ok(hasWarning(result, 'UNIFORM_DEDUCTION_PROHIBITED'))
  })

  it('does not create a penalty from an attendance violation', () => {
    const result = calculate({
      responsibilityViolations: [
        {
          employee_id: 1,
          violation_date: '2026-03-20',
          reason: 'Attendance violation',
          qualifies_for_responsibility_disqualification: false,
          recorded_by: 99,
          recorded_at: '2026-03-20 12:00:00',
        },
      ],
      penaltyRecords: [],
    })

    assert.equal(resultFor(result).totalApprovedDeductions, 0)
    assert.deepEqual(resultFor(result).approvedPenaltyDeductions, [])
  })

  it('makes deductions unavailable for malformed approved penalties', () => {
    const result = calculate({
      penaltyRecords: [
        validPenalty({
          amount: -1,
          reason: '',
          approved_by: null,
        }),
      ],
    })

    assert.ok(hasWarning(result, 'APPROVED_PENALTY_INCOMPLETE'))
    assert.equal(resultFor(result).totalApprovedDeductions, null)
    assert.equal(resultFor(result).finalPayableAmount, null)
  })

  it('makes deductions unavailable when penalty data is missing', () => {
    const result = calculate({ penaltyRecords: undefined })

    assert.ok(hasWarning(result, 'SOURCE_MISSING'))
    assert.equal(resultFor(result).totalApprovedDeductions, null)
    assert.equal(resultFor(result).finalPayableAmount, null)
    assert.equal(resultFor(result).isProvisional, true)
  })
})

describe('separate 13th-month bonus', () => {
  const bonusForStartDate = (startDate, overrides = {}) =>
    calculateThirteenthMonthBonus({
      employee: employee({ start_date: startDate, ...overrides }),
      year: 2026,
      hourlyRateRecords: [],
      config: structuredClone(config),
    })

  it('returns no bonus below six months of seniority', () => {
    const result = bonusForStartDate('2026-07-01')

    assert.equal(result.seniorityMonths, 5)
    assert.equal(result.status, 'INELIGIBLE')
    assert.equal(result.roundedAmount, 0)
  })

  it('applies 50 percent at exactly six months', () => {
    const result = bonusForStartDate('2026-06-30')

    assert.equal(result.seniorityMonths, 6)
    assert.equal(result.applicablePercentage, 0.5)
    assert.equal(result.status, 'AVAILABLE')
  })

  it('applies 50 percent for seniority below twelve months', () => {
    const result = bonusForStartDate('2026-01-31')

    assert.equal(result.seniorityMonths, 11)
    assert.equal(result.applicablePercentage, 0.5)
  })

  it('applies 100 percent at exactly twelve months', () => {
    const result = bonusForStartDate('2025-12-31')

    assert.equal(result.seniorityMonths, 12)
    assert.equal(result.applicablePercentage, 1)
  })

  it('applies 100 percent above twelve months', () => {
    const result = bonusForStartDate('2024-01-01')

    assert.ok(result.seniorityMonths > 12)
    assert.equal(result.applicablePercentage, 1)
  })

  it('uses the official hourly rate effective on December 31', () => {
    const result = calculateThirteenthMonthBonus({
      employee: employee({ start_date: '2026-06-30' }),
      year: 2026,
      hourlyRateRecords: [
        {
          employee_type: 'PART_TIME',
          hourly_rate: 21000,
          effective_from: '2026-01-01',
          effective_to: '2026-12-30',
        },
        {
          employee_type: 'PART_TIME',
          hourly_rate: 27000,
          effective_from: '2026-12-31',
          effective_to: null,
        },
      ],
      config: structuredClone(config),
    })

    assert.equal(result.hourlyRateReferenceDate, '2026-12-31')
    assert.equal(result.officialHourlyRate, 27000)
    assert.equal(result.basisHours, 100)
    assert.equal(result.amountBeforeRounding, 1350000)
  })

  it('prefers the employee-specific rate effective on December 31', () => {
    const result = calculateThirteenthMonthBonus({
      employee: employee({ start_date: '2026-06-30' }),
      year: 2026,
      hourlyRateRecords: [
        {
          employee_type: 'PART_TIME',
          hourly_rate: 27000,
          effective_from: '2026-01-01',
          effective_to: null,
        },
        {
          employee_id: 1,
          hourly_rate: 29000,
          effective_from: '2026-12-31',
          effective_to: null,
        },
      ],
      config: structuredClone(config),
    })

    assert.equal(result.hourlyRateReferenceDate, '2026-12-31')
    assert.equal(result.officialHourlyRate, 29000)
    assert.equal(result.amountBeforeRounding, 1450000)
  })

  it('uses the FT 200-hour basis and rounds the separate payment down', () => {
    const result = calculateThirteenthMonthBonus({
      employee: employee({
        employee_id: 2,
        employee_type: 'FULL_TIME',
        start_date: '2025-12-31',
      }),
      year: 2026,
      hourlyRateRecords: [
        {
          employee_type: 'FULL_TIME',
          hourly_rate: 25001,
          effective_from: '2025-01-01',
          effective_to: null,
        },
      ],
      config: structuredClone(config),
    })

    assert.equal(result.basisHours, 200)
    assert.equal(result.amountBeforeRounding, 5000200)
    assert.equal(result.roundedAmount, 5000000)
  })

  it('keeps the year-end bonus separate from monthly payroll', () => {
    const monthly = calculate({
      monthlyRevenueRecords: [revenue('2026-03')],
      config: {
        ...structuredClone(config),
        responsibilityBonusByEmployeeType: { PART_TIME: 0 },
      },
    })
    const thirteenth = bonusForStartDate('2026-06-30')

    assert.equal(resultFor(monthly).finalPayableAmount, 0)
    assert.equal(thirteenth.roundedAmount, 1150000)
    assert.notEqual(
      resultFor(monthly).finalPayableAmount,
      thirteenth.roundedAmount,
    )
  })
})

describe('rounding, missing data, and deterministic behavior', () => {
  it('rounds monthly payable down while retaining intermediate precision', () => {
    const result = calculate({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
      hourlyRateRecords: [
        {
          employee_id: 1,
          hourly_rate: 23001,
          effective_from: '2026-01-01',
          effective_to: null,
        },
      ],
      config: {
        ...structuredClone(config),
        responsibilityBonusByEmployeeType: { PART_TIME: 0 },
      },
    })
    const payroll = resultFor(result)

    assert.equal(payroll.actualAttendancePay, 23001)
    assert.equal(payroll.grossAmountBeforeDeductions, 23001)
    assert.equal(payroll.amountBeforeFinalRounding, 23001)
    assert.equal(payroll.finalPayableAmount, 23000)
  })

  it('preserves known zero separately from missing or unavailable amounts', () => {
    const knownZero = calculate({
      config: {
        ...structuredClone(config),
        responsibilityBonusByEmployeeType: { PART_TIME: 0 },
      },
    })
    const missingRevenue = calculate({ monthlyRevenueRecords: [] })

    assert.equal(resultFor(knownZero).kpiBonus.amount, 0)
    assert.equal(resultFor(knownZero).finalPayableAmount, 0)
    assert.equal(resultFor(missingRevenue).kpiBonus.amount, null)
    assert.equal(resultFor(missingRevenue).finalPayableAmount, null)
  })

  it('returns a provisional result when a required source is missing', () => {
    const result = calculate({ attendanceRecords: undefined })

    assert.ok(hasWarning(result, 'SOURCE_MISSING'))
    assert.equal(resultFor(result).isProvisional, true)
    assert.equal(resultFor(result).finalPayableAmount, null)
  })

  it('does not mutate input arrays or objects', () => {
    const input = makeInput({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
      hourlyRateRecords: [
        {
          employee_id: 1,
          hourly_rate: 26000,
          effective_from: '2026-01-01',
          effective_to: null,
        },
      ],
    })
    const before = structuredClone(input)

    calculateMonthlyPayroll(input)
    calculateThirteenthMonthBonus({
      employee: input.employees[0],
      year: 2026,
      hourlyRateRecords: input.hourlyRateRecords,
      config: input.config,
    })

    assert.deepEqual(input, before)
  })

  it('returns identical results for identical inputs', () => {
    const input = makeInput({
      attendanceRecords: [
        attendance(1, 1, '2026-03-10 10:00:00', '2026-03-10 11:00:00'),
      ],
    })

    assert.deepEqual(
      calculateMonthlyPayroll(input),
      calculateMonthlyPayroll(input),
    )
  })

  it('builds a stable payroll period and payday across year end', () => {
    assert.deepEqual(getPayrollPeriod('2026-12', config), {
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      payday: '2027-01-05',
    })
  })
})
