import { useState } from 'react'
import {
  CalendarCheckIcon,
  CalendarDaysIcon,
  Clock3Icon,
  DollarSignIcon,
  FileTextIcon,
  UsersIcon,
} from 'lucide-react'
import {
  dummyAttendanceData,
  dummyEmployeeData,
  dummyPayrollData,
  dummyRequestData,
  dummyShiftData,
  dummyShiftSwitchData,
} from '../assets/mockup-data'

const getDateOnly = (value) =>
  typeof value === 'string' ? value.slice(0, 10) : ''

const getToday = () => {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const formatDate = (value) => {
  const dateOnly = getDateOnly(value)
  if (!dateOnly) return '—'
  return new Date(`${dateOnly}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatTime = (value) => {
  if (typeof value !== 'string') return '—'
  return value.length > 10 ? value.slice(11, 16) : value.slice(0, 5)
}

const formatMinutes = (minutes) => {
  if (typeof minutes !== 'number') return '—'
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

const getStatusClass = (status) => {
  if (status === 'PENDING') return 'bg-gold-light text-brand-dark'
  if (['PRESENT', 'PAID', 'APPROVED'].includes(status)) {
    return 'bg-brand/10 text-brand'
  }
  return 'bg-background text-text-secondary'
}

const ManagerDashboard = () => {
  const today = getToday()
  const availableDates = [
    ...dummyShiftData.map((shift) => shift.work_date),
    ...dummyAttendanceData.map((record) => getDateOnly(record.check_in)),
    ...dummyRequestData.map((request) => getDateOnly(request.created_at)),
    ...dummyShiftSwitchData.map((request) => getDateOnly(request.created_at)),
    ...dummyPayrollData.flatMap((payroll) => [
      payroll.period_start,
      payroll.period_end,
    ]),
  ]
    .filter(Boolean)
    .sort()
  const [fromDate, setFromDate] = useState(
    () => availableDates[0] ?? today,
  )
  const [toDate, setToDate] = useState(
    () => availableDates.at(-1) ?? today,
  )

  const isInRange = (value) => {
    const date = getDateOnly(value)
    return date && date >= fromDate && date <= toDate
  }

  const rangeShifts = dummyShiftData.filter((shift) =>
    isInRange(shift.work_date),
  )
  const rangeAttendance = dummyAttendanceData.filter((record) =>
    isInRange(record.check_in),
  )
  const rangeRequests = dummyRequestData.filter((request) =>
    isInRange(request.created_at),
  )
  const rangeShiftSwitches = dummyShiftSwitchData.filter((request) =>
    isInRange(request.created_at),
  )
  const pendingRequests = rangeRequests.filter(
    (request) => request.status === 'PENDING',
  )
  const pendingShiftSwitches = rangeShiftSwitches.filter(
    (request) => request.status === 'PENDING',
  )
  const unclassifiedShiftSwitches = rangeShiftSwitches.filter(
    (request) => !request.status,
  )
  const todayShifts = dummyShiftData.filter(
    (shift) => getDateOnly(shift.work_date) === today,
  )
  const todayAttendance = dummyAttendanceData.filter(
    (record) => getDateOnly(record.check_in) === today,
  )
  const todayAttendanceStatuses = todayAttendance.reduce(
    (statuses, record) => {
      const status = record.attendance_status ?? 'Status unavailable'
      statuses.set(status, (statuses.get(status) ?? 0) + 1)
      return statuses
    },
    new Map(),
  )
  const payrolls = dummyPayrollData.filter(
    (payroll) =>
      payroll.period_start >= fromDate && payroll.period_end <= toDate,
  )
  const recordedWorkingMinutes = rangeAttendance.filter(
    (record) => typeof record.working_minutes === 'number',
  )
  const totalWorkingMinutes = recordedWorkingMinutes.reduce(
    (total, record) => total + record.working_minutes,
    0,
  )
  const recordedOvertimeMinutes = payrolls.filter(
    (payroll) => typeof payroll.total_overtime_minutes === 'number',
  )
  const totalOvertimeMinutes = recordedOvertimeMinutes.reduce(
    (total, payroll) => total + payroll.total_overtime_minutes,
    0,
  )
  const employeeById = new Map(
    dummyEmployeeData.map((employee) => [employee.employee_id, employee]),
  )
  const pendingCount = pendingRequests.length + pendingShiftSwitches.length
  const hasRange = fromDate && toDate && fromDate <= toDate

  const metrics = [
    {
      label: 'Total employees',
      value: dummyEmployeeData.length,
      detail: 'Employee records',
      icon: UsersIcon,
    },
    {
      label: "Today's scheduled shifts",
      value: todayShifts.length,
      detail: 'Scheduled for today',
      icon: CalendarDaysIcon,
    },
    {
      label: "Today's attendance",
      value: todayAttendance.length,
      detail: 'Attendance records',
      icon: CalendarCheckIcon,
    },
    {
      label: 'Pending requests',
      value: pendingCount,
      detail: 'In selected period',
      icon: FileTextIcon,
    },
  ]

  return (
    <div className='animate-fade-in space-y-8'>
      <header className='page-header flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='page-title'>Manager Dashboard</h1>
          <p className='page-subtitle'>
            Store operations overview for the selected period.
          </p>
        </div>
        <div className='grid w-full grid-cols-2 gap-3 sm:w-auto'>
          <label className='text-xs font-medium text-text-secondary'>
            From
            <input
              aria-label='Report start date'
              type='date'
              value={fromDate}
              max={toDate}
              onChange={(event) => setFromDate(event.target.value)}
              className='mt-1'
            />
          </label>
          <label className='text-xs font-medium text-text-secondary'>
            To
            <input
              aria-label='Report end date'
              type='date'
              value={toDate}
              min={fromDate}
              onChange={(event) => setToDate(event.target.value)}
              className='mt-1'
            />
          </label>
        </div>
      </header>

      <section
        aria-label='Operations summary'
        className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'
      >
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className='card card-hover flex items-center justify-between gap-4 p-5'
          >
            <div>
              <p className='text-sm font-medium text-text-secondary'>
                {metric.label}
              </p>
              <p className='mt-1 text-2xl font-semibold text-text-primary'>
                {metric.value}
              </p>
              <p className='mt-1 text-xs text-text-secondary'>
                {metric.detail}
              </p>
            </div>
            <metric.icon className='size-11 shrink-0 rounded-xl bg-gold-light p-3 text-brand' />
          </article>
        ))}
      </section>

      <section className='card p-5 sm:p-6'>
        <div className='mb-4'>
          <h2 className='font-semibold text-text-primary'>Team overview</h2>
          <p className='mt-1 text-sm text-text-secondary'>
            Employee information available in the current records.
          </p>
        </div>
        {dummyEmployeeData.length > 0 ? (
          <div className='overflow-x-auto'>
            <table className='table-modern min-w-[560px]'>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee type</th>
                  <th>Start date</th>
                  <th>Employment status</th>
                </tr>
              </thead>
              <tbody>
                {dummyEmployeeData.map((employee) => (
                  <tr key={employee.employee_id}>
                    <td className='font-medium text-text-primary'>
                      {employee.full_name}
                    </td>
                    <td className='text-text-secondary'>
                      {employee.employee_type?.replaceAll('_', ' ') ?? '—'}
                    </td>
                    <td className='text-text-secondary'>
                      {formatDate(employee.start_date)}
                    </td>
                    <td>
                      <span className='rounded-full bg-background px-2.5 py-1 text-xs text-text-secondary'>
                        {employee.employment_status ?? 'Status unavailable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className='rounded-lg bg-background px-4 py-8 text-center text-sm text-text-secondary'>
            No employee records available.
          </p>
        )}
      </section>

      <div className='grid grid-cols-1 gap-5 xl:grid-cols-2'>
        <section className='card overflow-hidden'>
          <div className='border-b border-border px-5 py-4 sm:px-6'>
            <h2 className='font-semibold text-text-primary'>Work schedule</h2>
            <p className='mt-1 text-sm text-text-secondary'>
              Shifts from {formatDate(fromDate)} to {formatDate(toDate)}.
            </p>
          </div>
          {hasRange && rangeShifts.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='table-modern min-w-[480px]'>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rangeShifts.map((shift) => (
                    <tr key={shift.shift_id}>
                      <td className='font-medium text-text-primary'>
                        {employeeById.get(shift.employee_id)?.full_name ??
                          'Employee unavailable'}
                      </td>
                      <td className='text-text-secondary'>
                        {formatDate(shift.work_date)}
                      </td>
                      <td className='whitespace-nowrap text-text-secondary'>
                        {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
                      </td>
                      <td>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${getStatusClass(shift.shift_status)}`}
                        >
                          {shift.shift_status ?? 'Status unavailable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className='px-5 py-8 text-center text-sm text-text-secondary sm:px-6'>
              {hasRange
                ? 'No scheduled shifts in this period.'
                : 'Select a valid date range to view shifts.'}
            </p>
          )}
        </section>

        <section className='card overflow-hidden'>
          <div className='border-b border-border px-5 py-4 sm:px-6'>
            <h2 className='font-semibold text-text-primary'>
              Attendance overview
            </h2>
            <p className='mt-1 text-sm text-text-secondary'>
              Today: {todayAttendance.length === 0
                ? 'No attendance records.'
                : [...todayAttendanceStatuses]
                    .map(([status, count]) => `${status}: ${count}`)
                    .join(' · ')}
              {' '}Records below cover the selected period.
            </p>
          </div>
          {hasRange && rangeAttendance.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='table-modern min-w-[520px]'>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Check in</th>
                    <th>Check out</th>
                    <th>Working time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rangeAttendance.map((record) => (
                    <tr key={record.attendance_id}>
                      <td className='font-medium text-text-primary'>
                        {employeeById.get(record.employee_id)?.full_name ??
                          'Employee unavailable'}
                      </td>
                      <td className='whitespace-nowrap text-text-secondary'>
                        {formatTime(record.check_in)}
                      </td>
                      <td className='whitespace-nowrap text-text-secondary'>
                        {formatTime(record.check_out)}
                      </td>
                      <td className='whitespace-nowrap text-text-secondary'>
                        {formatMinutes(record.working_minutes)}
                      </td>
                      <td>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${getStatusClass(record.attendance_status)}`}
                        >
                          {record.attendance_status ?? 'Status unavailable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className='px-5 py-8 text-center text-sm text-text-secondary sm:px-6'>
              {hasRange
                ? 'No attendance records in this period.'
                : 'Select a valid date range to view attendance.'}
            </p>
          )}
        </section>
      </div>

      <section className='card p-5 sm:p-6'>
        <div className='mb-4'>
          <h2 className='font-semibold text-text-primary'>Pending requests</h2>
          <p className='mt-1 text-sm text-text-secondary'>
            Employee requests and shift switches in the selected period.
          </p>
        </div>
        {hasRange && (pendingRequests.length > 0 || pendingShiftSwitches.length > 0) ? (
          <div className='space-y-3'>
            {pendingRequests.map((request) => (
              <article
                key={`request-${request.request_id}`}
                className='rounded-lg border border-border p-4'
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div>
                    <p className='text-sm font-semibold text-text-primary'>
                      {employeeById.get(request.employee_id)?.full_name ??
                        'Employee unavailable'}
                    </p>
                    <p className='mt-1 text-xs font-medium text-text-secondary'>
                      {request.request_type.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <span className='rounded-full bg-gold-light px-2.5 py-1 text-xs font-medium text-brand-dark'>
                    {request.status}
                  </span>
                </div>
                <p className='mt-3 text-sm text-text-secondary'>
                  {request.reason || 'No reason provided.'}
                </p>
                <p className='mt-2 text-xs text-text-secondary'>
                  Submitted {formatDate(request.created_at)}
                </p>
              </article>
            ))}
            {pendingShiftSwitches.map((request) => (
              <article
                key={`switch-${request.switch_id}`}
                className='rounded-lg border border-border p-4'
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <p className='text-sm font-semibold text-text-primary'>
                    Shift switch
                  </p>
                  <span className='rounded-full bg-gold-light px-2.5 py-1 text-xs font-medium text-brand-dark'>
                    {request.status}
                  </span>
                </div>
                <p className='mt-3 text-sm text-text-secondary'>
                  {request.reason || 'No reason provided.'}
                </p>
                <p className='mt-2 text-xs text-text-secondary'>
                  Submitted {formatDate(request.created_at)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className='rounded-lg bg-background px-4 py-8 text-center text-sm text-text-secondary'>
            {hasRange
              ? 'No pending requests in this period.'
              : 'Select a valid date range to view requests.'}
          </p>
        )}
        {hasRange && unclassifiedShiftSwitches.length > 0 && (
          <p className='mt-3 text-xs text-text-secondary'>
            {unclassifiedShiftSwitches.length} shift-switch record
            {unclassifiedShiftSwitches.length === 1 ? '' : 's'} omitted because
            status is unavailable.
          </p>
        )}
      </section>

      <section>
        <div className='mb-4'>
          <h2 className='font-semibold text-text-primary'>
            Working hours &amp; overtime
          </h2>
          <p className='mt-1 text-sm text-text-secondary'>
            Recorded attendance time and overtime from payroll periods.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <article className='card flex items-center gap-4 p-5'>
            <Clock3Icon className='size-11 shrink-0 rounded-xl bg-gold-light p-3 text-brand' />
            <div>
              <p className='text-sm font-medium text-text-secondary'>
                Recorded working time
              </p>
              <p className='mt-1 text-xl font-semibold text-text-primary'>
                {hasRange && recordedWorkingMinutes.length > 0
                  ? formatMinutes(totalWorkingMinutes)
                  : '—'}
              </p>
              <p className='mt-1 text-xs text-text-secondary'>
                From attendance records in the selected period
              </p>
            </div>
          </article>
          <article className='card flex items-center gap-4 p-5'>
            <CalendarCheckIcon className='size-11 shrink-0 rounded-xl bg-gold-light p-3 text-brand' />
            <div>
              <p className='text-sm font-medium text-text-secondary'>
                Recorded overtime
              </p>
              <p className='mt-1 text-xl font-semibold text-text-primary'>
                {hasRange && recordedOvertimeMinutes.length > 0
                  ? formatMinutes(totalOvertimeMinutes)
                  : '—'}
              </p>
              <p className='mt-1 text-xs text-text-secondary'>
                From complete payroll periods in the selected range
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className='card overflow-hidden'>
        <div className='border-b border-border px-5 py-4 sm:px-6'>
          <div className='flex items-center gap-3'>
            <DollarSignIcon className='size-9 rounded-lg bg-gold-light p-2 text-brand' />
            <div>
              <h2 className='font-semibold text-text-primary'>
                Payroll overview
              </h2>
              <p className='mt-1 text-sm text-text-secondary'>
                Payroll periods fully contained in the selected range.
              </p>
            </div>
          </div>
        </div>
        {hasRange && payrolls.length > 0 ? (
          <div className='overflow-x-auto'>
            <table className='table-modern min-w-[900px]'>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Period</th>
                  <th>Working time</th>
                  <th>Overtime</th>
                  <th>Gross salary</th>
                  <th>Deductions</th>
                  <th>Net salary</th>
                  <th>Payment status</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((payroll) => (
                  <tr key={payroll.payroll_id}>
                    <td className='font-medium text-text-primary'>
                      {employeeById.get(payroll.employee_id)?.full_name ??
                        'Employee unavailable'}
                    </td>
                    <td className='whitespace-nowrap text-text-secondary'>
                      {formatDate(payroll.period_start)} –{' '}
                      {formatDate(payroll.period_end)}
                    </td>
                    <td className='whitespace-nowrap text-text-secondary'>
                      {formatMinutes(payroll.total_working_minutes)}
                    </td>
                    <td className='whitespace-nowrap text-text-secondary'>
                      {formatMinutes(payroll.total_overtime_minutes)}
                    </td>
                    <td className='whitespace-nowrap text-text-secondary'>
                      {formatCurrency(payroll.gross_salary)}
                    </td>
                    <td className='whitespace-nowrap text-text-secondary'>
                      {formatCurrency(payroll.total_deductions)}
                    </td>
                    <td className='whitespace-nowrap font-medium text-text-primary'>
                      {formatCurrency(payroll.net_salary)}
                    </td>
                    <td>
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${getStatusClass(payroll.payment_status)}`}
                      >
                        {payroll.payment_status ?? 'Status unavailable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className='px-5 py-8 text-center text-sm text-text-secondary sm:px-6'>
            {hasRange
              ? 'No complete payroll periods in this range.'
              : 'Select a valid date range to view payroll.'}
          </p>
        )}
      </section>
    </div>
  )
}

export default ManagerDashboard
