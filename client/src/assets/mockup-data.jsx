// Crane Tea HRM mock data
// Shape aligned with the 11 database tables defined in Chapter 3.
// All records below are illustrative UI data, not real employee information.
// Fields whose ENUM values are not specified in Chapter 3 are left as null.

export const CRANE_TEA_POLICY = {
  partTime: {
    employee_type: 'PART_TIME',
    minHoursPerDay: 4,
    maxHoursPerDay: 8,
    minHoursPerMonth: 104,
    hourly_rate: 23000,
  },
  fullTime: {
    employee_type: 'FULL_TIME',
    minHoursPerDay: 8,
    maxHoursPerDay: 10,
    minWorkDaysPerMonth: 26,
    hourly_rate: 25000,
  },
  probation: {
    experienceDays: 3,
    probation_hourly_rate: 20000,
  },
  payroll: {
    period: 'First day to last day of each month',
    paymentDay: 5,
  },
  responsibilityBonus: {
    fullTime: 400000,
    partTime: 200000,
    // First-month exclusion is a verbal clarification, not written policy.
    firstMonthEligibility: 'VERBAL_MANAGER_CLARIFICATION',
  },
  kpiBonus: {
    revenueThreshold: 150000000,
    rate: 0.01,
    distributionMethod: null,
  },
  holidayMultipliers: {
    selectedPublicHolidays: 2,
    tet: 3,
    tetDates: '29 Tet through mùng 3',
  },
  thirteenthMonthBonus: {
    eligibilityStartsAtMonths: 6,
    calculationFormula: null,
  },
  unresolvedPolicy: {
    overtimePayFormula: null,
    kpiDistributionMethod: null,
    thirteenthMonthFormula: null,
    penaltyCalculation: null,
  },
}

// -----------------------------------------------------------------------------
// 3.3.1 USERS
// Columns: user_id, username, password_hash, role, account_status,
//          created_at, updated_at
// -----------------------------------------------------------------------------
export const dummyUsersData = [
  {
    user_id: 1,
    username: 'manager.demo',
    password_hash: '[HASHED_PASSWORD_PLACEHOLDER]',
    role: 'MANAGER',
    account_status: null,
    created_at: '2026-10-01 08:00:00',
    updated_at: '2026-10-01 08:00:00',
  },
  {
    user_id: 2,
    username: 'employee.demo',
    password_hash: '[HASHED_PASSWORD_PLACEHOLDER]',
    role: 'EMPLOYEE',
    account_status: null,
    created_at: '2026-10-02 08:00:00',
    updated_at: '2026-10-02 08:00:00',
  },
]

// -----------------------------------------------------------------------------
// 3.3.2 EMPLOYEES
// Columns: employee_id, user_id, full_name, phone, date_of_birth,
//          employee_type, start_date, employment_status, probation_status
// -----------------------------------------------------------------------------
export const dummyEmployeeData = [
  {
    employee_id: 1,
    user_id: 2,
    full_name: 'Crane Tea Employee (Demo)',
    phone: null,
    date_of_birth: null,
    employee_type: 'PART_TIME',
    start_date: '2026-10-02',
    employment_status: null,
    probation_status: null,
  },
]

// -----------------------------------------------------------------------------
// 3.3.3 AVAILABILITY
// Columns: availability_id, employee_id, week_start, day_of_week,
//          start_time, end_time, is_off
// day_of_week uses the TINYINT field from the report; numbering convention
// should be confirmed by the implementation before relying on it.
// -----------------------------------------------------------------------------
export const dummyAvailabilityData = [
  {
    availability_id: 1,
    employee_id: 1,
    week_start: '2026-11-09',
    day_of_week: 1,
    start_time: '08:00:00',
    end_time: '14:00:00',
    is_off: false,
  },
  {
    availability_id: 2,
    employee_id: 1,
    week_start: '2026-11-09',
    day_of_week: 1,
    start_time: '16:00:00',
    end_time: '21:00:00',
    is_off: false,
  },
  {
    availability_id: 3,
    employee_id: 1,
    week_start: '2026-11-09',
    day_of_week: 2,
    start_time: null,
    end_time: null,
    is_off: true,
  },
]

// -----------------------------------------------------------------------------
// 3.3.4 SHIFTS
// Columns: shift_id, employee_id, work_date, start_time, end_time,
//          shift_status, created_at
// -----------------------------------------------------------------------------
export const dummyShiftData = [
  {
    shift_id: 1,
    employee_id: 1,
    work_date: '2026-11-11',
    start_time: '08:00:00',
    end_time: '14:00:00',
    shift_status: null,
    created_at: '2026-11-08 15:00:00',
  },
]

// -----------------------------------------------------------------------------
// 3.3.5 ATTENDANCE
// Columns: attendance_id, employee_id, shift_id, check_in, check_out,
//          working_minutes, attendance_status, note
// -----------------------------------------------------------------------------
export const dummyAttendanceData = [
  {
    attendance_id: 1,
    employee_id: 1,
    shift_id: 1,
    check_in: '2026-11-11 08:02:00',
    check_out: '2026-11-11 14:03:00',
    working_minutes: 361,
    attendance_status: null,
    note: null,
  },
]

// -----------------------------------------------------------------------------
// 3.3.6 REQUESTS
// Columns: request_id, employee_id, request_type, start_time, end_time,
//          reason, status, reviewed_by, reviewed_at, created_at
// -----------------------------------------------------------------------------
export const dummyRequestData = [
  {
    request_id: 1,
    employee_id: 1,
    request_type: 'LEAVE',
    start_time: '2026-11-14 08:00:00',
    end_time: '2026-11-14 14:00:00',
    reason: 'Demo leave request',
    status: 'PENDING',
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-11-08 10:00:00',
  },
  {
    request_id: 2,
    employee_id: 1,
    request_type: 'OVERTIME',
    start_time: '2026-11-11 14:00:00',
    end_time: '2026-11-11 16:00:00',
    reason: 'Demo overtime request',
    status: 'PENDING',
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-11-08 10:30:00',
  },
  {
    request_id: 3,
    employee_id: 1,
    request_type: 'ATTENDANCE_CORRECTION',
    start_time: '2026-11-11 08:00:00',
    end_time: '2026-11-11 08:02:00',
    reason: 'Demo attendance correction request',
    status: 'PENDING',
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-11-11 14:10:00',
  },
]

// -----------------------------------------------------------------------------
// 3.3.7 SHIFT_SWITCHES
// Columns: switch_id, shift_id, requester_id, replacement_id, start_time,
//          end_time, reason, status, created_at
// -----------------------------------------------------------------------------
export const dummyShiftSwitchData = [
  {
    switch_id: 1,
    shift_id: 1,
    requester_id: 1,
    replacement_id: null,
    start_time: '2026-11-11 08:00:00',
    end_time: '2026-11-11 11:00:00',
    reason: 'Demo request to find a replacement for part of the shift',
    status: null,
    created_at: '2026-11-09 09:00:00',
  },
]

// -----------------------------------------------------------------------------
// 3.3.8 PAYROLLS
// Columns: payroll_id, employee_id, period_start, period_end,
//          total_working_minutes, total_overtime_minutes, gross_salary,
//          total_deductions, net_salary, payment_status
// -----------------------------------------------------------------------------
export const dummyPayrollData = [
  {
    payroll_id: 1,
    employee_id: 1,
    period_start: '2026-10-01',
    period_end: '2026-10-31',
    total_working_minutes: 6240,
    total_overtime_minutes: 0,
    gross_salary: 2392000,
    total_deductions: 0,
    net_salary: 2392000,
    payment_status: null,
  },
]

// -----------------------------------------------------------------------------
// 3.3.9 PAYROLL_DETAILS
// Columns: detail_id, payroll_id, item_name, item_type, amount, description
// -----------------------------------------------------------------------------
export const dummyPayrollDetailsData = [
  {
    detail_id: 1,
    payroll_id: 1,
    item_name: 'Hourly wage',
    item_type: 'INCOME',
    amount: 2392000,
    description: 'Illustrative amount only; calculated from recorded working time and the applicable hourly rate.',
  },
]

// -----------------------------------------------------------------------------
// 3.3.10 SALARY_CONFIGS
// Columns: config_id, employee_type, hourly_rate, probation_hourly_rate,
//          effective_from, effective_to
// -----------------------------------------------------------------------------
export const dummySalaryConfigData = [
  {
    config_id: 1,
    employee_type: 'PART_TIME',
    hourly_rate: 23000,
    probation_hourly_rate: 20000,
    effective_from: null,
    effective_to: null,
  },
  {
    config_id: 2,
    employee_type: 'FULL_TIME',
    hourly_rate: 25000,
    probation_hourly_rate: 20000,
    effective_from: null,
    effective_to: null,
  },
]

// -----------------------------------------------------------------------------
// 3.3.11 ACTIVITY_LOGS
// Columns: log_id, user_id, action, entity_type, entity_id, old_value,
//          new_value, created_at
// -----------------------------------------------------------------------------
export const dummyActivityLogData = [
  {
    log_id: 1,
    user_id: 1,
    action: 'CREATE',
    entity_type: 'SHIFTS',
    entity_id: 1,
    old_value: null,
    new_value: {
      shift_id: 1,
      employee_id: 1,
      work_date: '2026-11-11',
      start_time: '08:00:00',
      end_time: '14:00:00',
    },
    created_at: '2026-11-08 15:00:00',
  },
]

// -----------------------------------------------------------------------------
// UI compatibility exports
// Keep these minimal until each screen is migrated to consume table-shaped data.
// They do not represent additional database tables.
// -----------------------------------------------------------------------------
export const dummyProfileData = {
  user_id: 2,
  username: 'employee.demo',
  full_name: 'Crane Tea Employee (Demo)',
}

export const dummyManagerDashboardData = {
  role: 'MANAGER',
  totalEmployees: dummyEmployeeData.length,
  totalDepartments: null, // No DEPARTMENTS table exists in Chapter 3.
  todayAttendance: dummyAttendanceData.length,
  pendingRequests: dummyRequestData.filter((request) => request.status === 'PENDING').length,
}

export const dummyEmployeeDashboardData = {
  role: 'EMPLOYEE',
  employee: dummyEmployeeData[0],
  currentMonthWorkingMinutes: dummyPayrollData[0].total_working_minutes,
  pendingRequests: dummyRequestData.filter((request) => request.employee_id === 1 && request.status === 'PENDING').length,
  latestPayslip: dummyPayrollData[0],
}

// Temporary compatibility alias for legacy components that still import this name.
// Remove it when Dashboard.jsx is updated to use MANAGER / EMPLOYEE.
export const dummyAdminDashboardData = {
  ...dummyManagerDashboardData,
}

export function getWorkingHoursDisplay(record) {
  const minutes = record.working_minutes
  if (minutes != null) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (record.check_in && !record.check_out) {
    const elapsedMinutes = Math.max(
      0,
      Math.floor((Date.now() - new Date(record.check_in).getTime()) / 60000),
    )
    return `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m (ongoing)`
  }

  return '—'
}

export function getDayTypeDisplay(record) {
  if (record.check_in && !record.check_out) {
    return { label: 'In Progress', className: '' }
  }

  if (record.working_minutes != null) {
    return { label: getWorkingHoursDisplay(record), className: '' }
  }

  return { label: '—', className: '' }
}
