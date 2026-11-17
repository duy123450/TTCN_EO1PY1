import { dummyEmployeeData } from './mockup-data'

export const payrollPreviewConfig = {
  period: {
    firstDayOfMonth: 1,
    includesLastCalendarDay: true,
  },
  payday: {
    dayOfMonth: 5,
    monthsAfterPayrollPeriod: 1,
  },
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
    distribution: 'Equal shares among all employees employed during the month',
  },
  holidayMultipliers: {
    publicHoliday: 2,
    tet: 3,
  },
  deductions: {
    uniformDeductionsAllowed: false,
    attendanceViolationsAutomaticallyCreatePenalties: false,
    onlyApprovedPenaltiesAreEligible: true,
  },
  minimumShortfallReducesSalary: false,
  finalRounding: {
    unitVnd: 1000,
    direction: 'Down',
  },
  thirteenthMonthBonus: {
    minimumSeniorityMonths: 6,
    partialRate: 0.5,
    partialRateMinimumMonths: 6,
    partialRateMaximumMonthsExclusive: 12,
    fullRate: 1,
    fullRateMinimumMonths: 12,
    seniorityEvaluationDate: 'December 31',
    hourlyRateReferenceDate: 'December 31',
    basisHoursByEmployeeType: {
      PART_TIME: 100,
      FULL_TIME: 200,
    },
    separatePaymentRoundingUnitVnd: 1000,
  },
}

/**
 * Supplemental employment fields keyed by the existing employee ID.
 * A null end date means no end date is recorded in this preview.
 */
export const payrollEmploymentData = dummyEmployeeData.map(
  ({ employee_id, employment_end_date }) => ({
    employee_id,
    employment_end_date: employment_end_date ?? null,
  }),
)

/**
 * @typedef {Object} EffectiveHourlyRateRecord
 * @property {number|null} employee_id
 * @property {'PART_TIME'|'FULL_TIME'|null} employee_type
 * @property {number} hourly_rate
 * @property {string} effective_from ISO date
 * @property {string|null} effective_to ISO date or null for no end date
 */

/** @type {EffectiveHourlyRateRecord[]} */
export const effectiveHourlyRateData = []

/**
 * @typedef {Object} MonthlyRevenueRecord
 * @property {string} payroll_month YYYY-MM
 * @property {number} total_revenue
 * @property {string} updated_at ISO timestamp
 */

/** @type {MonthlyRevenueRecord[]} */
export const monthlyRevenueData = []

/**
 * Approved overtime is stored separately from employee-submitted requests.
 * @typedef {Object} ApprovedOvertimeRecord
 * @property {number} employee_id
 * @property {number|null} request_id Optional link to the submitted request
 * @property {string|null} actual_start_time ISO timestamp
 * @property {string|null} actual_end_time ISO timestamp
 * @property {number|null} actual_minutes Confirmed duration when timestamps are unavailable
 * @property {string} approval_status
 * @property {number|null} approved_by
 * @property {string|null} approved_at ISO timestamp
 */

/** @type {ApprovedOvertimeRecord[]} */
export const approvedOvertimeData = []

/**
 * @typedef {Object} ResponsibilityViolationRecord
 * @property {number} employee_id
 * @property {string} violation_date ISO date
 * @property {string} reason
 * @property {boolean} qualifies_for_responsibility_disqualification
 * @property {number} recorded_by
 * @property {string} recorded_at ISO timestamp
 */

/** @type {ResponsibilityViolationRecord[]} */
export const responsibilityViolationData = []

/**
 * @typedef {Object} ApprovedPenaltyRecord
 * @property {number} employee_id
 * @property {number} amount
 * @property {string} reason
 * @property {string} violation_date ISO date
 * @property {number|null} recorded_by Manager who recorded the penalty
 * @property {string} approval_status
 * @property {number|null} approved_by
 * @property {string|null} approved_at ISO timestamp
 * @property {boolean} is_uniform_deduction
 * @property {string|null} payroll_month YYYY-MM when assigned
 */

/** @type {ApprovedPenaltyRecord[]} */
export const penaltyData = []

export const payrollHolidayCalendar = {
  year: 2026,
  is_complete: false,
  incomplete_reason:
    'Gregorian dates for the lunar holidays have not been verified.',
  holidays: [
    {
      date: '2026-01-01',
      holiday_name: "New Year's Day",
      holiday_category: 'PUBLIC_HOLIDAY',
      applicable_multiplier: 2,
    },
    {
      date: '2026-04-30',
      holiday_name: 'Reunification Day',
      holiday_category: 'PUBLIC_HOLIDAY',
      applicable_multiplier: 2,
    },
    {
      date: '2026-05-01',
      holiday_name: 'International Workers Day',
      holiday_category: 'PUBLIC_HOLIDAY',
      applicable_multiplier: 2,
    },
    {
      date: '2026-09-02',
      holiday_name: 'National Day',
      holiday_category: 'PUBLIC_HOLIDAY',
      applicable_multiplier: 2,
    },
  ],
  unresolvedLunarRules: [
    {
      holiday_name: "Hung Kings' Commemoration Day",
      lunar_rule: 'Lunar March 10',
      holiday_category: 'PUBLIC_HOLIDAY',
      applicable_multiplier: 2,
    },
    {
      holiday_name: 'Tet',
      lunar_rule: 'Lunar December 29 through lunar January 3',
      holiday_category: 'TET',
      applicable_multiplier: 3,
    },
  ],
}
