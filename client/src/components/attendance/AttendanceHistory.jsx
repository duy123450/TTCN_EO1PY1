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
  const date = parseDateTime(value)
  return date
    ? new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
    : '—'
}

const formatTime = (value) => {
  const date = parseDateTime(value)
  return date
    ? new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
    : '—'
}

const formatWorkingTime = (record) => {
  const minutes = record.working_minutes
  if (
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes < 0
  ) {
    return '—'
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

const AttendanceHistory = ({ history }) => (
  <section className='card overflow-hidden'>
    <div className='border-b border-border px-4 py-4 sm:px-6'>
      <h2 className='font-semibold text-text-primary'>Attendance history</h2>
    </div>
    <div className='overflow-x-auto'>
      <table className='table-modern min-w-[760px]'>
        <thead>
          <tr>
            <th>Date</th>
            <th>Check in</th>
            <th>Check out</th>
            <th>Working time</th>
            <th>Attendance information</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={5} className='py-12 text-center text-text-secondary'>
                No attendance records found.
              </td>
            </tr>
          ) : (
            history.map((record) => (
              <tr key={record.attendance_id}>
                <td className='whitespace-nowrap font-medium text-text-primary'>
                  {formatDate(record.check_in)}
                </td>
                <td className='whitespace-nowrap text-text-secondary'>
                  {formatTime(record.check_in)}
                </td>
                <td className='whitespace-nowrap text-text-secondary'>
                  {record.check_out ? (
                    formatTime(record.check_out)
                  ) : (
                    <span className='badge badge-warning'>
                      Missing check-out
                    </span>
                  )}
                </td>
                <td className='whitespace-nowrap text-text-secondary'>
                  {formatWorkingTime(record)}
                </td>
                <td className='text-text-secondary'>
                  {record.attendance_status ?? 'Status not provided'}
                  {record.note ? ` · ${record.note}` : ''}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
)

export default AttendanceHistory
