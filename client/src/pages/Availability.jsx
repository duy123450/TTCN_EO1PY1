import { useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  dummyAvailabilityData,
  dummyEmployeeData,
  dummyProfileData,
} from '../assets/mockup-data'
import AvailabilityForm from '../components/availability/AvailabilityForm'
import AvailabilityOverview from '../components/availability/AvailabilityOverview'

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const toDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const getMonday = (date) => {
  const monday = new Date(date)
  const daysSinceMonday = (monday.getDay() + 6) % 7
  monday.setDate(monday.getDate() - daysSinceMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const formatDate = (date) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)

const Availability = () => {
  const { role } = useOutletContext()
  const [availability, setAvailability] = useState(() =>
    dummyAvailabilityData.map((record) => ({ ...record })),
  )
  const [weekStart, setWeekStart] = useState(() =>
    toDateKey(addDays(getMonday(new Date()), 7)),
  )
  const nextAvailabilityId = useRef(
    Math.max(0, ...dummyAvailabilityData.map((record) => record.availability_id)) +
      1,
  )
  const isManager = role === 'MANAGER'
  const employee = dummyEmployeeData.find(
    (record) => record.user_id === dummyProfileData.user_id,
  )
  const weekEnd = toDateKey(addDays(parseDateKey(weekStart), 6))
  const weekLabel = `${formatDate(parseDateKey(weekStart))} – ${formatDate(parseDateKey(weekEnd))}`
  const weekAvailability = useMemo(
    () => availability.filter((record) => record.week_start === weekStart),
    [availability, weekStart],
  )
  const employeeAvailability = useMemo(
    () =>
      weekAvailability.filter(
        (record) => record.employee_id === employee?.employee_id,
      ),
    [employee?.employee_id, weekAvailability],
  )

  const changeWeek = (offset) => {
    setWeekStart((currentWeek) =>
      toDateKey(addDays(parseDateKey(currentWeek), offset * 7)),
    )
  }

  const saveEmployeeAvailability = (records) => {
    if (!employee) return

    const updatedRecords = records.map((record) => ({
      ...record,
      availability_id: nextAvailabilityId.current++,
      employee_id: employee.employee_id,
      week_start: weekStart,
    }))

    setAvailability((currentAvailability) => [
      ...currentAvailability.filter(
        (record) =>
          record.employee_id !== employee.employee_id ||
          record.week_start !== weekStart,
      ),
      ...updatedRecords,
    ])
  }

  if (role !== 'MANAGER' && role !== 'EMPLOYEE') {
    return (
      <p className='py-12 text-center text-text-secondary'>
        Availability is unavailable for this role.
      </p>
    )
  }

  return (
    <div className='animate-fade-in space-y-6'>
      <header className='page-header'>
        <h1 className='page-title'>
          {isManager ? 'Employee Availability' : 'My Availability'}
        </h1>
        <p className='page-subtitle'>
          {isManager
            ? 'Review employee availability when preparing the weekly work schedule.'
            : 'Set the times you are available to work next week.'}
        </p>
      </header>

      <p className='rounded-lg border border-gold/30 bg-gold-light/40 px-4 py-3 text-sm text-text-secondary'>
        Preview only: changes are kept in memory and reset when the page reloads.
      </p>

      <section className='flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-wide text-text-secondary'>
            Week of
          </p>
          <p className='mt-1 font-semibold text-text-primary'>{weekLabel}</p>
          <p className='mt-1 text-xs text-text-secondary'>
            Monday, {formatDate(parseDateKey(weekStart))} – Sunday,{' '}
            {formatDate(parseDateKey(weekEnd))}
          </p>
        </div>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={() => changeWeek(-1)}
            className='btn-secondary'
          >
            Previous week
          </button>
          <button
            type='button'
            onClick={() => changeWeek(1)}
            className='btn-secondary'
          >
            Next week
          </button>
        </div>
      </section>

      {isManager ? (
        <AvailabilityOverview
          employees={dummyEmployeeData}
          availability={weekAvailability}
          weekStart={weekStart}
          dayNames={DAY_NAMES}
        />
      ) : employee ? (
        <AvailabilityForm
          key={weekStart}
          employee={employee}
          records={employeeAvailability}
          dayNames={DAY_NAMES}
          onSave={saveEmployeeAvailability}
        />
      ) : (
        <p className='rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-secondary'>
          No employee record is available for the current profile.
        </p>
      )}
    </div>
  )
}

export default Availability
