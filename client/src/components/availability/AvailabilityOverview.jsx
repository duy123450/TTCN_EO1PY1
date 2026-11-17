const formatTime = (time) => {
  if (
    typeof time !== 'string' ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)
  ) {
    return '—'
  }

  const date = new Date(`2000-01-01T${time}`)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const AvailabilityOverview = ({
  employees,
  availability,
  weekStart,
  dayNames,
}) => {
  if (employees.length === 0) {
    return (
      <p className='rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-secondary'>
        No employees are available to display.
      </p>
    )
  }

  return (
    <div className='space-y-4'>
      {employees.map((employee) => {
        const employeeRecords = availability.filter(
          (record) =>
            record.employee_id === employee.employee_id &&
            record.week_start === weekStart,
        )

        return (
          <section
            key={employee.employee_id}
            className='rounded-xl border border-border bg-surface p-4 sm:p-6'
          >
            <div className='mb-4 flex flex-wrap items-baseline justify-between gap-2'>
              <h2 className='font-semibold text-text-primary'>
                {employee.full_name}
              </h2>
              <span className='text-xs text-text-secondary'>
                {employee.employee_type?.replace('_', ' ') ?? 'Employee'}
              </span>
            </div>

            {employeeRecords.length === 0 ? (
              <p className='rounded-lg bg-slate-50 px-4 py-3 text-sm text-text-secondary'>
                No availability submitted for this week.
              </p>
            ) : (
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                {dayNames.map((dayName, dayIndex) => {
                  const dayRecords = employeeRecords.filter(
                    (record) => record.day_of_week === dayIndex + 1,
                  )
                  const dayOff = dayRecords.some((record) => record.is_off)

                  return (
                    <div
                      key={dayName}
                      className='min-h-24 rounded-lg border border-border p-3'
                    >
                      <h3 className='text-sm font-medium text-text-primary'>
                        {dayName}
                      </h3>
                      {dayOff ? (
                        <p className='mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-text-secondary'>
                          Off / unavailable
                        </p>
                      ) : dayRecords.length > 0 ? (
                        <ul className='mt-2 space-y-1'>
                          {dayRecords.map((record) => (
                            <li
                              key={record.availability_id}
                              className='rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800'
                            >
                              {formatTime(record.start_time)} –{' '}
                              {formatTime(record.end_time)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className='mt-2 text-xs text-text-secondary'>
                          No availability submitted
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export default AvailabilityOverview
