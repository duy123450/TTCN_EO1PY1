import { AlertCircleIcon, CalendarIcon, ClockIcon } from 'lucide-react'

const formatMinutes = (minutes) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}m`

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

const AttendanceStats = ({ history }) => {
  const completedSessions = history.filter(
    (record) => {
      const checkIn = parseDateTime(record.check_in)
      const checkOut = parseDateTime(record.check_out)
      return checkIn && checkOut && checkOut > checkIn
    },
  ).length
  const openSessions = history.filter(
    (record) =>
      parseDateTime(record.check_in) &&
      (record.check_out == null || record.check_out === ''),
  ).length
  const recordedMinutes = history.reduce(
    (total, record) =>
      typeof record.working_minutes === 'number' &&
      Number.isFinite(record.working_minutes) &&
      record.working_minutes >= 0
        ? total + record.working_minutes
        : total,
    0,
  )
  const stats = [
    {
      label: 'Completed sessions',
      value: completedSessions,
      icon: CalendarIcon,
    },
    { label: 'Open sessions', value: openSessions, icon: AlertCircleIcon },
    {
      label: 'Recorded working time',
      value: formatMinutes(recordedMinutes),
      icon: ClockIcon,
    },
  ]

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5'>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className='card flex items-center gap-4 p-5 sm:p-6'
        >
          <div className='rounded-lg bg-slate-100 p-3'>
            <stat.icon className='size-5 text-slate-600' />
          </div>
          <div>
            <p className='text-sm text-text-secondary'>{stat.label}</p>
            <p className='text-xl font-medium tracking-tight text-text-primary'>
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default AttendanceStats
