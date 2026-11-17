import { useMemo, useState } from 'react'

const getLocalDateKey = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null
  }
  return `${year}-${month}-${day}`
}

const parseDateTime = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return null
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T]([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
  )
  if (!match) return null
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  date.setHours(Number(hourText), Number(minuteText), Number(secondText ?? 0), 0)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value) => {
  const dateKey = getLocalDateKey(value)
  if (!dateKey) return '—'
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

const formatDateTime = (value) => {
  const date = parseDateTime(value)
  return date
    ? new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
    : '—'
}

const getRecordDate = (record, shiftById) =>
  getLocalDateKey(record.check_in) ??
  getLocalDateKey(shiftById.get(record.shift_id)?.work_date)

const ManagerAttendanceView = ({ attendanceRecords, employees, shifts }) => {
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.employee_id, employee])),
    [employees],
  )
  const shiftById = useMemo(
    () => new Map(shifts.map((shift) => [shift.shift_id, shift])),
    [shifts],
  )
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const recordDates = attendanceRecords
    .map((record) => getRecordDate(record, shiftById))
    .filter(Boolean)
    .sort()
  const [fromDate, setFromDate] = useState(() => recordDates[0] ?? today)
  const [toDate, setToDate] = useState(() =>
    today > (recordDates.at(-1) ?? '') ? today : recordDates.at(-1) ?? today,
  )
  const hasValidRange = fromDate === '' || toDate === '' || fromDate <= toDate
  const filteredRecords = attendanceRecords
    .filter((record) => {
      const date = getRecordDate(record, shiftById)
      return (
        hasValidRange &&
        date &&
        (fromDate === '' || date >= fromDate) &&
        (toDate === '' || date <= toDate)
      )
    })
    .sort((a, b) => (b.check_in ?? '').localeCompare(a.check_in ?? ''))

  return (
    <div className='animate-fade-in space-y-6'>
      <header className='page-header'>
        <h1 className='page-title'>Attendance</h1>
        <p className='page-subtitle'>
          Review attendance records across the store.
        </p>
      </header>

      <p className='rounded-lg border border-gold/30 bg-gold-light/40 px-4 py-3 text-sm text-text-secondary'>
        Preview only: timestamps use the browser&apos;s local clock and are not
        server-verified. Changes reset when the page reloads.
      </p>

      <section className='card flex flex-col gap-4 p-4 sm:flex-row sm:items-end'>
        <label className='flex flex-col gap-1 text-sm text-text-secondary'>
          From
          <input
            type='date'
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label className='flex flex-col gap-1 text-sm text-text-secondary'>
          Through
          <input
            type='date'
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
        <p className='text-sm text-text-secondary'>
          {filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'}
        </p>
      </section>

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
              {!hasValidRange ? (
                <tr>
                  <td colSpan={7} className='py-12 text-center text-rose-600'>
                    The start date must not be after the end date.
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className='py-12 text-center text-text-secondary'>
                    No attendance records in this period.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const shift = shiftById.get(record.shift_id)
                  const checkIn = parseDateTime(record.check_in)
                  const checkOut = parseDateTime(record.check_out)
                  const hasMissingCheckOut = !checkOut
                  const minutes =
                    typeof record.working_minutes === 'number' &&
                    Number.isFinite(record.working_minutes) &&
                    record.working_minutes >= 0
                      ? `${Math.floor(record.working_minutes / 60)}h ${record.working_minutes % 60}m`
                      : '—'

                  return (
                    <tr key={record.attendance_id}>
                      <td className='font-medium text-text-primary'>
                        {employeeById.get(record.employee_id)?.full_name ??
                          `Employee #${record.employee_id}`}
                      </td>
                      <td className='whitespace-nowrap text-text-secondary'>
                        {formatDate(record.check_in ?? shift?.work_date)}
                      </td>
                      <td className='text-text-secondary'>
                        {shift ? `Shift #${shift.shift_id}` : `#${record.shift_id}`}
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
                        {hasMissingCheckOut && record.attendance_status == null
                          ? ' · Needs review'
                          : ''}
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
