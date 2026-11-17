import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  dummyEmployeeData,
  dummyProfileData,
} from '../assets/mockup-data'
import {
  approvedOvertimeData,
  effectiveHourlyRateData,
  monthlyRevenueData,
  payrollEmploymentData,
  payrollHolidayCalendar,
  payrollPreviewConfig,
  penaltyData,
  responsibilityViolationData,
} from '../assets/payroll-preview-data'
import { useAttendancePreview } from '../context/AttendancePreviewContext'
import {
  calculateMonthlyPayroll,
  calculateThirteenthMonthBonus,
  getPayrollPeriod,
} from '../utils/payroll-calculations'
import PayrollEmployeeDetails from '../components/payroll/PayrollEmployeeDetails'
import PayrollKpiOverview from '../components/payroll/PayrollKpiOverview'
import PayrollWarnings from '../components/payroll/PayrollWarnings'

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])/
const employeeVisibleGlobalWarningCodes = new Set([
  'SOURCE_MISSING',
  'SOURCE_INVALID',
  'PAYDAY_CONFIGURATION_INVALID',
  'HOLIDAY_CALENDAR_MISSING',
  'HOLIDAY_CALENDAR_INCOMPLETE',
  'HOLIDAY_CALENDAR_YEAR_MISMATCH',
  'INVALID_HOLIDAY_RECORD',
  'CONFLICTING_HOLIDAY_RECORDS',
  'UNRESOLVED_LUNAR_HOLIDAYS',
  'MONTHLY_REVENUE_MISSING',
  'MONTHLY_REVENUE_INVALID',
  'MONTHLY_REVENUE_CONFLICT',
  'KPI_CONFIGURATION_INVALID',
  'FINAL_ROUNDING_CONFIGURATION_INVALID',
])

const getMonthKey = (value) => {
  if (typeof value !== 'string') return null
  const match = value.match(MONTH_PATTERN)
  return match ? `${match[1]}-${match[2]}` : null
}

const getPayrollMonths = (
  calendarYear,
  attendanceRecords,
  overtimeRequests,
  revenueRecords,
  overtimeRecords,
) => {
  const years = new Set()
  if (Number.isInteger(calendarYear)) years.add(calendarYear)

  const observedMonths = [
    ...attendanceRecords.map((record) => getMonthKey(record?.check_in)),
    ...overtimeRequests.map((record) => getMonthKey(record?.start_time)),
    ...revenueRecords.map((record) => getMonthKey(record?.payroll_month)),
    ...overtimeRecords.map((record) =>
      getMonthKey(record?.actual_start_time),
    ),
  ].filter(Boolean)

  observedMonths.forEach((month) => years.add(Number(month.slice(0, 4))))
  if (years.size === 0) years.add(new Date().getFullYear())

  return [...years]
    .sort((left, right) => right - left)
    .flatMap((year) =>
      Array.from(
        { length: 12 },
        (_, index) => `${year}-${String(12 - index).padStart(2, '0')}`,
      ),
    )
}

const getDefaultPayrollMonth = (
  calendarYear,
  attendanceRecords,
  overtimeRequests,
  revenueRecords,
  overtimeRecords,
) => {
  const observedMonths = [
    ...attendanceRecords.map((record) => getMonthKey(record?.check_in)),
    ...overtimeRequests.map((record) => getMonthKey(record?.start_time)),
    ...revenueRecords.map((record) => getMonthKey(record?.payroll_month)),
    ...overtimeRecords.map((record) =>
      getMonthKey(record?.actual_start_time),
    ),
  ]
    .filter(Boolean)
    .sort()

  return observedMonths.at(-1) ?? `${calendarYear}-01`
}

const formatDate = (value) => {
  if (typeof value !== 'string') return 'Unavailable'
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return 'Unavailable'
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12)
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return 'Unavailable'
  }
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatMonth = (month) => {
  const match = month.match(MONTH_PATTERN)
  if (!match) return month
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1, 12))
}

const Payroll = () => {
  const outletContext = useOutletContext()
  const role = outletContext?.role
  const { attendanceRecords, requests } = useAttendancePreview()
  const overtimeRequests = useMemo(
    () => requests.filter((request) => request.request_type === 'OVERTIME'),
    [requests],
  )
  const payrollMonths = useMemo(
    () =>
      getPayrollMonths(
        payrollHolidayCalendar.year,
        attendanceRecords,
        overtimeRequests,
        monthlyRevenueData,
        approvedOvertimeData,
      ),
    [attendanceRecords, overtimeRequests],
  )
  const [payrollMonth, setPayrollMonth] = useState(() =>
    getDefaultPayrollMonth(
      payrollHolidayCalendar.year,
      attendanceRecords,
      overtimeRequests,
      monthlyRevenueData,
      approvedOvertimeData,
    ),
  )
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    () => dummyEmployeeData[0]?.employee_id ?? null,
  )
  const isManager = role === 'MANAGER'
  const isEmployee = role === 'EMPLOYEE'

  const payroll = useMemo(
    () =>
      calculateMonthlyPayroll({
        payrollMonth,
        config: payrollPreviewConfig,
        employees: dummyEmployeeData,
        employmentRecords: payrollEmploymentData,
        attendanceRecords,
        hourlyRateRecords: effectiveHourlyRateData,
        monthlyRevenueRecords: monthlyRevenueData,
        approvedOvertimeRecords: approvedOvertimeData,
        overtimeRequests,
        responsibilityViolations: responsibilityViolationData,
        penaltyRecords: penaltyData,
        holidayCalendar: payrollHolidayCalendar,
      }),
    [attendanceRecords, overtimeRequests, payrollMonth],
  )
  const period = useMemo(
    () => getPayrollPeriod(payrollMonth, payrollPreviewConfig),
    [payrollMonth],
  )
  const thirteenthMonthBonuses = useMemo(
    () =>
      new Map(
        dummyEmployeeData.map((employee) => [
          employee.employee_id,
          calculateThirteenthMonthBonus({
            employee,
            year: Number(payrollMonth.slice(0, 4)),
            hourlyRateRecords: effectiveHourlyRateData,
            config: payrollPreviewConfig,
          }),
        ]),
      ),
    [payrollMonth],
  )
  const employeeById = useMemo(
    () =>
      new Map(
        dummyEmployeeData.map((employee) => [
          employee.employee_id,
          employee,
        ]),
      ),
    [],
  )
  const employeePayrollById = useMemo(
    () =>
      new Map(
        payroll.employees.map((employeePayroll) => [
          employeePayroll.employeeId,
          employeePayroll,
        ]),
      ),
    [payroll.employees],
  )
  const currentProfileEmployee = dummyEmployeeData.find(
    (employee) => employee.user_id === dummyProfileData.user_id,
  )
  const selectedEmployee =
    employeeById.get(selectedEmployeeId) ?? dummyEmployeeData[0] ?? null
  const selectedEmployeePayroll = selectedEmployee
    ? employeePayrollById.get(selectedEmployee.employee_id) ?? null
    : null
  const selectedThirteenthMonthBonus = selectedEmployee
    ? thirteenthMonthBonuses.get(selectedEmployee.employee_id) ?? null
    : null
  const currentEmployeePayroll = currentProfileEmployee
    ? employeePayrollById.get(currentProfileEmployee.employee_id) ?? null
    : null
  const currentEmployeeThirteenthMonthBonus = currentProfileEmployee
    ? thirteenthMonthBonuses.get(currentProfileEmployee.employee_id) ?? null
    : null
  const managerWarnings = payroll.warnings.filter(
    (warning) =>
      warning.employeeId == null ||
      !employeePayrollById.has(warning.employeeId),
  )
  const employeeWarnings = payroll.warnings.filter(
    (warning) =>
      warning.employeeId === currentProfileEmployee?.employee_id ||
      employeeVisibleGlobalWarningCodes.has(warning.code),
  )
  const employeeGlobalWarnings = employeeWarnings.filter(
    (warning) => warning.employeeId == null,
  )
  const employeeRecordWarnings = employeeWarnings.filter(
    (warning) =>
      warning.employeeId === currentProfileEmployee?.employee_id,
  )

  if (!isManager && !isEmployee) {
    return (
      <div className='animate-fade-in'>
        <header className='page-header'>
          <h1 className='page-title'>Payroll</h1>
        </header>
        <p className='card p-6 text-sm text-text-secondary'>
          Payroll is unavailable for this preview role.
        </p>
      </div>
    )
  }

  return (
    <div className='animate-fade-in space-y-6'>
      <header className='page-header'>
        <h1 className='page-title'>{isManager ? 'Payroll' : 'My Payroll'}</h1>
        <p className='page-subtitle'>
          {isManager
            ? 'Review calculated monthly payroll and employee details.'
            : 'Review your calculated monthly payroll details.'}
        </p>
      </header>

      <p className='rounded-lg border border-gold/30 bg-gold-light/40 px-4 py-3 text-sm text-text-secondary'>
        Frontend preview only: the role selector is not authentication or
        authorization. Payroll amounts are calculated from available preview
        records and are not finalized pay statements.
      </p>

      <section className='card flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5'>
        <label className='flex w-full flex-col gap-2 text-sm font-medium text-text-primary sm:max-w-xs'>
          Payroll month
          <select
            aria-label='Payroll month'
            value={payrollMonth}
            onChange={(event) => setPayrollMonth(event.target.value)}
          >
            {payrollMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonth(month)}
              </option>
            ))}
          </select>
        </label>
        <dl className='grid grid-cols-2 gap-4 text-sm sm:min-w-96'>
          <div>
            <dt className='text-text-secondary'>Payroll period</dt>
            <dd className='mt-1 font-medium text-text-primary'>
              {formatDate(period.startDate)} – {formatDate(period.endDate)}
            </dd>
          </div>
          <div>
            <dt className='text-text-secondary'>Payday</dt>
            <dd className='mt-1 font-medium text-text-primary'>
              {formatDate(period.payday)}
            </dd>
          </div>
        </dl>
      </section>

      {isManager ? (
        <>
          <PayrollKpiOverview
            kpi={payroll.kpi}
            config={payrollPreviewConfig}
          />

          <PayrollWarnings
            warnings={managerWarnings}
            employees={employeeById}
            title='Payroll data warnings'
          />

          <section className='card overflow-hidden'>
            <div className='border-b border-border px-4 py-4 sm:px-6'>
              <h2 className='font-semibold text-text-primary'>
                Employee payroll summary
              </h2>
              <p className='mt-1 text-sm text-text-secondary'>
                Select an employee to inspect the calculated breakdown.
              </p>
            </div>
            <div className='overflow-x-auto'>
              <table className='table-modern min-w-[850px]'>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Attendance</th>
                    <th>Additional overtime</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Final payable</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.employees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className='py-10 text-center text-sm text-text-secondary'
                      >
                        No employees have a resolved employment record for this
                        month.
                      </td>
                    </tr>
                  ) : (
                    payroll.employees.map((employeePayroll) => {
                      const employee = employeeById.get(
                        employeePayroll.employeeId,
                      )
                      return (
                        <tr key={employeePayroll.employeeId}>
                          <td className='font-medium text-text-primary'>
                            {employee?.full_name ?? 'Employee unavailable'}
                          </td>
                          <td className='whitespace-nowrap text-text-secondary'>
                            {employeePayroll.attendanceMinutes == null
                              ? 'Unavailable'
                              : `${(employeePayroll.attendanceMinutes / 60).toFixed(2)} h`}
                          </td>
                          <td className='whitespace-nowrap text-text-secondary'>
                            {employeePayroll.approvedAdditionalOvertimeMinutes ==
                            null
                              ? 'Unavailable'
                              : `${(employeePayroll.approvedAdditionalOvertimeMinutes / 60).toFixed(2)} h`}
                          </td>
                          <td className='whitespace-nowrap text-text-secondary'>
                            {formatCurrency(
                              employeePayroll.grossAmountBeforeDeductions,
                            )}
                          </td>
                          <td className='whitespace-nowrap text-text-secondary'>
                            {formatCurrency(
                              employeePayroll.totalApprovedDeductions,
                            )}
                          </td>
                          <td className='whitespace-nowrap font-medium text-text-primary'>
                            {formatCurrency(
                              employeePayroll.finalPayableAmount,
                            )}
                          </td>
                          <td>
                            <PayrollStatus employeePayroll={employeePayroll} />
                          </td>
                          <td>
                            <button
                              type='button'
                              className='btn-secondary px-3 py-1.5 text-xs'
                              onClick={() =>
                                setSelectedEmployeeId(
                                  employeePayroll.employeeId,
                                )
                              }
                            >
                              View details
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <label className='flex max-w-md flex-col gap-2 text-sm font-medium text-text-primary'>
            Employee details
            <select
              aria-label='Employee payroll details'
              value={selectedEmployee?.employee_id ?? ''}
              onChange={(event) =>
                setSelectedEmployeeId(Number(event.target.value))
              }
            >
              {dummyEmployeeData.map((employee) => (
                <option key={employee.employee_id} value={employee.employee_id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </label>

          {selectedEmployee ? (
            <PayrollEmployeeDetails
              employee={selectedEmployee}
              employeePayroll={selectedEmployeePayroll}
              thirteenthMonthBonus={selectedThirteenthMonthBonus}
              warnings={
                selectedEmployeePayroll?.warnings.filter(
                  (warning) =>
                    warning.employeeId === selectedEmployee.employee_id,
                ) ?? []
              }
            />
          ) : (
            <p className='card p-6 text-sm text-text-secondary'>
              No employee record is available for this preview.
            </p>
          )}
        </>
      ) : (
        <>
          {!currentProfileEmployee ? (
            <p className='card p-6 text-sm text-text-secondary'>
              No employee record is available for the current preview profile.
            </p>
          ) : (
            <>
              <PayrollWarnings
                warnings={
                  currentEmployeePayroll
                    ? employeeGlobalWarnings
                    : employeeWarnings
                }
                title='Your payroll data warnings'
              />
              <PayrollEmployeeDetails
                employee={currentProfileEmployee}
                employeePayroll={currentEmployeePayroll}
                thirteenthMonthBonus={currentEmployeeThirteenthMonthBonus}
                warnings={employeeRecordWarnings}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

const formatCurrency = (amount) =>
  typeof amount === 'number' && Number.isFinite(amount)
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(amount)
    : 'Unavailable'

const PayrollStatus = ({ employeePayroll }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
      employeePayroll.isProvisional
        ? 'bg-amber-50 text-amber-800'
        : 'bg-emerald-50 text-emerald-800'
    }`}
  >
    {employeePayroll.isProvisional ? 'Provisional' : 'Complete data'}
  </span>
)

export default Payroll
