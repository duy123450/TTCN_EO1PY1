const formatTime = (value) => {
  if (typeof value !== 'string') return '—'
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (!match) return '—'
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]))
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const formatDate = (date) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)

const EmployeeScheduleView = ({ employee, days, publishedShifts }) => {
  if (!employee) {
    return (
      <p className='card p-6 text-center text-sm text-text-secondary'>
        No employee record is available for the current profile.
      </p>
    )
  }

  if (publishedShifts === null) {
    return (
      <p className='card p-6 text-center text-sm text-text-secondary'>
        No published schedule is available for this week. Draft schedules are
        not shown here.
      </p>
    )
  }

  const ownShifts = publishedShifts
    .filter((shift) => shift.employee_id === employee.employee_id)
    .sort(
      (a, b) =>
        a.work_date.localeCompare(b.work_date) ||
        a.start_time.localeCompare(b.start_time),
    )

  return (
    <section className='card overflow-hidden'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6'>
        <div>
          <h2 className='font-semibold text-text-primary'>
            Published schedule
          </h2>
          <p className='mt-1 text-sm text-text-secondary'>
            Shifts assigned to {employee.full_name}.
          </p>
        </div>
        <span className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800'>
          Published
        </span>
      </div>

      <div className='divide-y divide-border'>
        {days.map((day) => {
          const dayShifts = ownShifts.filter(
            (shift) => shift.work_date === day.dateKey,
          )

          return (
            <div
              key={day.dateKey}
              className='flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:gap-6 sm:px-6'
            >
              <div className='w-36 shrink-0'>
                <p className='font-medium text-text-primary'>{day.dayName}</p>
                <p className='text-sm text-text-secondary'>
                  {formatDate(day.date)}
                </p>
              </div>
              {dayShifts.length > 0 ? (
                <ul className='space-y-2'>
                  {dayShifts.map((shift) => (
                    <li
                      key={shift.shift_id}
                      className='rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900'
                    >
                      {formatTime(shift.start_time)} –{' '}
                      {formatTime(shift.end_time)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='text-sm text-text-secondary'>No shift assigned.</p>
              )}
            </div>
          )
        })}
      </div>
      {ownShifts.length === 0 && (
        <p className='border-t border-border px-4 py-3 text-xs text-text-secondary sm:px-6'>
          No shifts are assigned to you in this published schedule.
        </p>
      )}
    </section>
  )
}

export default EmployeeScheduleView
