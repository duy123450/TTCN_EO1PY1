import { useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  dummyAvailabilityData,
  dummyEmployeeData,
  dummyProfileData,
  dummyShiftData,
} from '../assets/mockup-data'
import EmployeeScheduleView from '../components/schedule/EmployeeScheduleView'
import ManagerScheduleView from '../components/schedule/ManagerScheduleView'
import { useAttendancePreview } from '../context/AttendancePreviewContext'

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

const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const getMonday = (date) => {
  const monday = new Date(date)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return monday
}

const getWeekStartForDate = (dateKey) =>
  toDateKey(getMonday(parseDateKey(dateKey)))

const createInitialDrafts = () =>
  dummyShiftData.reduce((drafts, shift) => {
    const weekStart = getWeekStartForDate(shift.work_date)
    drafts[weekStart] ??= []
    drafts[weekStart].push({ ...shift })
    return drafts
  }, {})

const createInitialScheduleState = () => ({
  draftsByWeek: createInitialDrafts(),
  workingByWeek: {},
  publishedByWeek: {},
})

let schedulePreviewState

const formatLocalDateTime = (date) => {
  const datePart = toDateKey(date)
  const timePart = [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join(':')
  return `${datePart} ${timePart}`
}

const WorkSchedule = () => {
  const { role } = useOutletContext()
  const { publishSchedule } = useAttendancePreview()
  const [weekStart, setWeekStart] = useState(() =>
    toDateKey(addDays(getMonday(new Date()), 7)),
  )
  const [scheduleState, setScheduleState] = useState(() => {
    schedulePreviewState ??= createInitialScheduleState()
    return schedulePreviewState
  })
  const scheduleStateRef = useRef(scheduleState)
  const weekEnd = toDateKey(addDays(parseDateKey(weekStart), 6))
  const weekDays = useMemo(
    () =>
      DAY_NAMES.map((dayName, index) => {
        const date = addDays(parseDateKey(weekStart), index)
        return { dayName, date, dateKey: toDateKey(date) }
      }),
    [weekStart],
  )
  const weekAvailability = useMemo(
    () =>
      dummyAvailabilityData.filter(
        (record) => record.week_start === weekStart,
      ),
    [weekStart],
  )
  const hasSavedDraft = Object.prototype.hasOwnProperty.call(
    scheduleState.draftsByWeek,
    weekStart,
  )
  const draftShifts = scheduleState.draftsByWeek[weekStart] ?? []
  const workingShifts =
    scheduleState.workingByWeek[weekStart] ?? draftShifts
  const publishedShifts = Object.prototype.hasOwnProperty.call(
    scheduleState.publishedByWeek,
    weekStart,
  )
    ? scheduleState.publishedByWeek[weekStart]
    : null
  const hasUnsavedChanges = hasSavedDraft
    ? JSON.stringify(workingShifts) !== JSON.stringify(draftShifts)
    : workingShifts.length > 0
  const publishedMatchesDraft =
    publishedShifts != null &&
    JSON.stringify(publishedShifts) === JSON.stringify(draftShifts)
  const employee = dummyEmployeeData.find(
    (record) => record.user_id === dummyProfileData.user_id,
  )

  const updateScheduleState = (update) => {
    const nextState = update(scheduleStateRef.current)
    scheduleStateRef.current = nextState
    schedulePreviewState = nextState
    setScheduleState(nextState)
  }

  const changeWeek = (offset) => {
    setWeekStart((currentWeek) =>
      toDateKey(addDays(parseDateKey(currentWeek), offset * 7)),
    )
  }

  const updateWorkingShifts = (update) => {
    updateScheduleState((currentState) => {
      const currentShifts =
        currentState.workingByWeek[weekStart] ??
        currentState.draftsByWeek[weekStart] ??
        []
      const nextShifts = update(currentShifts)
      return {
        ...currentState,
        workingByWeek: {
          ...currentState.workingByWeek,
          [weekStart]: nextShifts,
        },
      }
    })
  }

  const handleAddShift = (values) => {
    const knownShifts = [
      ...dummyShiftData,
      ...Object.values(scheduleStateRef.current.draftsByWeek).flat(),
      ...Object.values(scheduleStateRef.current.workingByWeek).flat(),
      ...Object.values(scheduleStateRef.current.publishedByWeek).flat(),
    ]
    const shiftId =
      Math.max(0, ...knownShifts.map((shift) => shift.shift_id)) + 1

    updateWorkingShifts((shifts) => [
      ...shifts,
      {
        shift_id: shiftId,
        employee_id: values.employee_id,
        work_date: values.work_date,
        start_time: values.start_time,
        end_time: values.end_time,
        shift_status: null,
        created_at: formatLocalDateTime(new Date()),
      },
    ])
  }

  const handleUpdateShift = (shiftId, values) => {
    updateWorkingShifts((shifts) =>
      shifts.map((shift) =>
        shift.shift_id === shiftId ? { ...shift, ...values } : shift,
      ),
    )
  }

  const handleDeleteShift = (shiftId) => {
    updateWorkingShifts((shifts) =>
      shifts.filter((shift) => shift.shift_id !== shiftId),
    )
  }

  const handleSaveDraft = () => {
    const shiftsToSave = workingShifts.map((shift) => ({ ...shift }))
    updateScheduleState((currentState) => ({
      ...currentState,
      draftsByWeek: {
        ...currentState.draftsByWeek,
        [weekStart]: shiftsToSave,
      },
      workingByWeek: {
        ...currentState.workingByWeek,
        [weekStart]: shiftsToSave,
      },
    }))
  }

  const handlePublish = () => {
    if (!hasSavedDraft || hasUnsavedChanges) return

    const publishedSnapshot = (scheduleStateRef.current.draftsByWeek[weekStart] ?? [])
      .map((shift) => ({ ...shift }))
    updateScheduleState((currentState) => ({
      ...currentState,
      publishedByWeek: {
        ...currentState.publishedByWeek,
        [weekStart]: publishedSnapshot,
      },
    }))
    publishSchedule(weekStart, publishedSnapshot)
  }

  if (role !== 'MANAGER' && role !== 'EMPLOYEE') {
    return (
      <p className='py-12 text-center text-text-secondary'>
        Work Schedule is unavailable for this role.
      </p>
    )
  }

  return (
    <div className='animate-fade-in space-y-6'>
      <header className='page-header'>
        <h1 className='page-title'>
          {role === 'MANAGER' ? 'Work Schedule' : 'My Schedule'}
        </h1>
        <p className='page-subtitle'>
          {role === 'MANAGER'
            ? 'Prepare and publish the weekly employee schedule.'
            : 'View your published shifts for the selected week.'}
        </p>
      </header>

      <p className='rounded-lg border border-gold/30 bg-gold-light/40 px-4 py-3 text-sm text-text-secondary'>
        Preview only: schedule changes are kept in memory and reset when the
        page reloads.
      </p>

      <section className='flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-wide text-text-secondary'>
            Selected week
          </p>
          <p className='mt-1 font-semibold text-text-primary'>
            {new Intl.DateTimeFormat('en', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(parseDateKey(weekStart))}{' '}
            –{' '}
            {new Intl.DateTimeFormat('en', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(parseDateKey(weekEnd))}
          </p>
          <p className='mt-1 text-xs text-text-secondary'>
            Monday through Sunday
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

      {role === 'MANAGER' ? (
        <ManagerScheduleView
          employees={dummyEmployeeData}
          days={weekDays}
          weekStart={weekStart}
          weekEnd={weekEnd}
          shifts={workingShifts}
          availability={weekAvailability}
          hasSavedDraft={hasSavedDraft}
          hasUnsavedChanges={hasUnsavedChanges}
          hasPublishedSchedule={publishedShifts !== null}
          publishedMatchesDraft={publishedMatchesDraft}
          onAddShift={handleAddShift}
          onUpdateShift={handleUpdateShift}
          onDeleteShift={handleDeleteShift}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
        />
      ) : (
        <EmployeeScheduleView
          employee={employee}
          days={weekDays}
          publishedShifts={publishedShifts}
        />
      )}
    </div>
  )
}

export default WorkSchedule
