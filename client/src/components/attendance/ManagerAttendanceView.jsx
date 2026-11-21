import { useMemo, useState } from 'react'

const parseDateTime = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return null
  const mysqlDate = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/,
  )
  const date = mysqlDate
    ? new Date(
        `${mysqlDate[1]}-${mysqlDate[2]}-${mysqlDate[3]}T${mysqlDate[4]}:${mysqlDate[5]}:${mysqlDate[6] ?? '00'}+07:00`,
      )
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value) => {
  const date = parseDateTime(value)
  return date
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date)
    : '—'
}

const formatDateTime = (value) => {
  const date = parseDateTime(value)
  return date
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
    : '—'
}

const formatShiftTime = (value) => {
  if (typeof value !== 'string') return '—'
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (!match) return '—'
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]))
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const ManagerAttendanceView = ({
  attendanceRecords,
  employees,
  shifts,
  loading,
  error,
  onApplyFilters,
}) => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [rangeError, setRangeError] = useState('')

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.employee_id, employee])),
    [employees],
  )
  const shiftById = useMemo(
    () => new Map(shifts.map((shift) => [shift.shift_id, shift])),
    [shifts],
  )

  const applyFilters = () => {
    if (startDate && endDate && startDate > endDate) {
      setRangeError('The start date must not be after the end date.')
      return
    }
    setRangeError('')
    onApplyFilters({ startDate, endDate, employeeId })
  }

  return (
    <div className='animate-fade-in space-y-6'>
      <header className='page-header'>
        <h1 className='page-title'>Attendance</h1>
        <p className='page-subtitle'>
          Review attendance records across the store.
        </p>
      </header>

      <section className='card flex flex-col gap-4 p-4 sm:flex-row sm:items-end'>
        <label className='flex flex-col gap-1 text-sm text-text-secondary'>
          Employee
          <select
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          >
            <option value=''>All employees</option>
            {employees.map((employee) => (
              <option
                key={employee.employee_id}
                value={employee.employee_id}
              >
                {employee.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className='flex flex-col gap-1 text-sm text-text-secondary'>
          From
          <input
            type='date'
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label className='flex flex-col gap-1 text-sm text-text-secondary'>
          Through
          <input
            type='date'
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <button
          type='button'
          className='btn-secondary'
          disabled={loading}
          onClick={applyFilters}
        >
          Apply filters
        </button>
        <p className='text-sm text-text-secondary'>
          {attendanceRecords.length} record{attendanceRecords.length === 1 ? '' : 's'}
        </p>
      </section>

      {(rangeError || error) && (
        <p
          role='alert'
          className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'
        >
          {rangeError || error}
        </p>
      )}

      <section className='card overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='table-modern min-w-[980px]'>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Check in</th>
                <th>Check out</th>
                <th>Working time</th>
                <th>Attendance information</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className='py-12 text-center text-text-secondary'>
                    Loading attendance...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className='py-12 text-center text-rose-700'>
                    {error}
                  </td>
                </tr>
              ) : attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className='py-12 text-center text-text-secondary'>
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((record) => {
                  const employee = employeeById.get(record.employee_id)
                  const shift = shiftById.get(record.shift_id)
                  const checkIn = parseDateTime(record.check_in)
                  const checkOut = parseDateTime(record.check_out)
                  const minutes =
                    typeof record.working_minutes === 'number' &&
                    Number.isFinite(record.working_minutes) &&
                    record.working_minutes >= 0
                      ? `${Math.floor(record.working_minutes / 60)}h ${record.working_minutes % 60}m`
                      : '—'

                  return (
                    <tr key={record.attendance_id}>
                      <td className='font-medium text-text-primary'>
                        {employee?.full_name ?? `Employee #${record.employee_id}`}
                      </td>
                      <td className='whitespace-nowrap text-text-secondary'>
                        {formatDate(record.check_in ?? shift?.work_date)}
                      </td>
                      <td className='text-text-secondary'>
                        {shift
                          ? `Shift #${shift.shift_id} · ${formatShiftTime(shift.start_time)}–${formatShiftTime(shift.end_time)}`
                          : `#${record.shift_id}`}
                      </td>
                      <td className='whitespace-nowrap text-text-secondary'>
                        {checkIn ? formatDateTime(record.check_in) : 'Missing check-in'}
                      </td>
                      <td className='whitespace-nowrap text-text-secondary'>
                        {checkOut ? (
                          formatDateTime(record.check_out)
                        ) : (
                          <span className='badge badge-warning'>Missing check-out</span>
                        )}
                      </td>
                      <td className='whitespace-nowrap text-text-secondary'>
                        {minutes}
                      </td>
                      <td className='text-text-secondary'>
                        {record.attendance_status ?? 'Status not provided'}
                        {record.note ? ` · ${record.note}` : ''}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default ManagerAttendanceView
