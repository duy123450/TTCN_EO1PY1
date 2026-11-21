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
    ? new Intl.DateTimeFormat('en', {
        timeZone: 'Asia/Ho_Chi_Minh',
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
        timeZone: 'Asia/Ho_Chi_Minh',
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
