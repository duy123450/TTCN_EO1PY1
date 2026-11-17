import PayrollWarnings from './PayrollWarnings'

const formatCurrency = (amount) =>
  typeof amount === 'number' && Number.isFinite(amount)
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(amount)
    : 'Unavailable'

const formatHours = (minutes) =>
  typeof minutes === 'number' && Number.isFinite(minutes)
    ? `${new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(minutes / 60)} hours`
    : 'Unavailable'

const PayrollEmployeeDetails = ({
  employee,
  employeePayroll,
  thirteenthMonthBonus,
  warnings,
}) => (
  <section className='space-y-4'>
    <article className='card overflow-hidden'>
      <div className='flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
        <div>
          <h2 className='font-semibold text-text-primary'>
            {employee.full_name} payroll breakdown
          </h2>
          <p className='mt-1 text-sm text-text-secondary'>
            {employee.employee_type === 'PART_TIME'
              ? 'Part-time'
              : employee.employee_type === 'FULL_TIME'
                ? 'Full-time'
                : 'Employee type unavailable'}
          </p>
        </div>
        {employeePayroll && (
          <PayrollStatus employeePayroll={employeePayroll} />
        )}
      </div>

      {employeePayroll ? (
        <div className='space-y-6 p-4 sm:p-6'>
          {employeePayroll.isProvisional && (
            <p className='rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950'>
              This payroll result is provisional. Unavailable amounts are not
              treated as zero and must not be used as finalized pay.
            </p>
          )}

          <dl className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            <Metric label='Attendance hours' value={formatHours(
              employeePayroll.attendanceMinutes ??
                employeePayroll.knownAttendanceMinutes,
            )} note={
              employeePayroll.attendanceMinutes == null &&
              employeePayroll.knownAttendanceMinutes != null
                ? 'Known records only; attendance data is incomplete'
                : undefined
            } />
            <Metric
              label='Approved additional overtime'
              value={formatHours(
                employeePayroll.approvedAdditionalOvertimeMinutes ??
                  employeePayroll.knownApprovedAdditionalOvertimeMinutes,
              )}
              note={
                employeePayroll.approvedAdditionalOvertimeMinutes == null &&
                employeePayroll.knownApprovedAdditionalOvertimeMinutes != null
                  ? 'Known records only; overtime data is incomplete'
                  : undefined
              }
            />
            <Metric
              label='Attendance pay including holiday premiums'
              value={formatCurrency(employeePayroll.hourlyAttendancePay)}
            />
            <Metric
              label='Approved overtime pay including premiums'
              value={formatCurrency(
                employeePayroll.approvedAdditionalOvertimePay,
              )}
            />
            <Metric
              label='Probation-rate pay'
              value={formatCurrency(employeePayroll.probationPay)}
            />
            <Metric
              label='Official-rate pay'
              value={formatCurrency(employeePayroll.officialRatePay)}
            />
            <Metric
              label='Responsibility bonus'
              value={formatCurrency(employeePayroll.responsibilityBonus.amount)}
              note={employeePayroll.responsibilityBonus.eligible == null
                ? 'Eligibility unavailable'
                : employeePayroll.responsibilityBonus.eligible
                  ? 'Eligible'
                  : 'Not eligible'}
            />
            <Metric
              label='KPI bonus'
              value={formatCurrency(employeePayroll.kpiBonus.amount)}
              note='This employee’s share only'
            />
            <Metric
              label='Gross before deductions'
              value={formatCurrency(
                employeePayroll.grossAmountBeforeDeductions,
              )}
            />
            <Metric
              label='Approved deductions'
              value={formatCurrency(
                employeePayroll.totalApprovedDeductions,
              )}
            />
            <Metric
              label='Final monthly payable'
              value={formatCurrency(employeePayroll.finalPayableAmount)}
              emphasis
            />
          </dl>

          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            <section>
              <h3 className='font-semibold text-text-primary'>
                Responsibility bonus eligibility
              </h3>
              <p className='mt-2 text-sm text-text-secondary'>
                {employeePayroll.responsibilityBonus.reason}
              </p>
            </section>

            <section>
              <h3 className='font-semibold text-text-primary'>
                Approved deduction details
              </h3>
              {employeePayroll.approvedPenaltyDeductions.length > 0 ? (
                <ul className='mt-2 divide-y divide-border'>
                  {employeePayroll.approvedPenaltyDeductions.map(
                    (deduction, index) => (
                      <li
                        key={`${deduction.violationDate}-${index}`}
                        className='flex flex-col gap-1 py-2 text-sm sm:flex-row sm:justify-between'
                      >
                        <span className='text-text-secondary'>
                          {deduction.reason} · {deduction.violationDate}
                        </span>
                        <span className='font-medium text-text-primary'>
                          {formatCurrency(deduction.amount)}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className='mt-2 text-sm text-text-secondary'>
                  {employeePayroll.totalApprovedDeductions === 0
                    ? 'No approved deductions recorded.'
                    : 'No valid approved deduction details are available.'}
                </p>
              )}
            </section>
          </div>
        </div>
      ) : (
        <p className='p-5 text-sm text-text-secondary'>
          No monthly payroll result is available for this employee in the
          selected period.
        </p>
      )}
    </article>

    {warnings.length > 0 && (
      <PayrollWarnings
        warnings={warnings}
        title={`${employee.full_name} payroll warnings`}
      />
    )}

    {thirteenthMonthBonus && (
      <article className='card p-4 sm:p-5'>
        <h3 className='font-semibold text-text-primary'>
          Separate 13th-month calculation
        </h3>
        <p className='mt-1 text-sm text-text-secondary'>
          Evaluated for {thirteenthMonthBonus.year}; this separate payment is
          not included in monthly payroll.
        </p>
        <dl className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Metric
            label='Status'
            value={thirteenthMonthBonus.status}
          />
          <Metric
            label='Seniority at Dec 31'
            value={
              thirteenthMonthBonus.seniorityMonths == null
                ? 'Unavailable'
                : `${thirteenthMonthBonus.seniorityMonths} months`
            }
          />
          <Metric
            label='Separate rounded amount'
            value={formatCurrency(thirteenthMonthBonus.roundedAmount)}
          />
        </dl>
        {thirteenthMonthBonus.warnings.length > 0 && (
          <div className='mt-4'>
            <PayrollWarnings
              warnings={thirteenthMonthBonus.warnings}
              title='13th-month calculation warnings'
            />
          </div>
        )}
      </article>
    )}
  </section>
)

const Metric = ({ label, value, note, emphasis = false }) => (
  <div className='rounded-lg border border-border bg-background/50 p-3'>
    <dt className='text-xs font-medium text-text-secondary'>{label}</dt>
    <dd
      className={`mt-1 break-words ${
        emphasis
          ? 'text-lg font-semibold text-text-primary'
          : 'font-medium text-text-primary'
      }`}
    >
      {value}
    </dd>
    {note && <p className='mt-1 text-xs text-text-secondary'>{note}</p>}
  </div>
)

const PayrollStatus = ({ employeePayroll }) => (
  <span
    className={`inline-flex w-fit whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
      employeePayroll.isProvisional
        ? 'bg-amber-50 text-amber-800'
        : 'bg-emerald-50 text-emerald-800'
    }`}
  >
    {employeePayroll.isProvisional ? 'Provisional' : 'Complete data'}
  </span>
)

export default PayrollEmployeeDetails
