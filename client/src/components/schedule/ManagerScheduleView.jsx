import { useState } from 'react'
import { CalendarPlusIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import ShiftEditor from './ShiftEditor'

const getMinutes = (time) => {
  if (typeof time !== 'string') return null
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

const formatTime = (time) => {
  const minutes = getMinutes(time)
  if (minutes === null) return '—'
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)
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

const ManagerScheduleView = ({
  employees,
  days,
  weekStart,
  weekEnd,
  shifts,
  availability,
  hasSavedDraft,
  hasUnsavedChanges,
  hasPublishedSchedule,
  publishedMatchesDraft,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onSaveDraft,
  onPublish,
}) => {
  const [editing, setEditing] = useState(null)

  const getDayAvailability = (employeeId, dateKey) =>
    availability.filter(
      (record) =>
        record.employee_id === employeeId &&
        record.day_of_week >= 1 &&
        record.day_of_week <= 7 &&
        (() => {
          const [year, month, day] = record.week_start.split('-').map(Number)
          const date = new Date(year, month - 1, day)
          date.setDate(date.getDate() + record.day_of_week - 1)
          const recordDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          return recordDate === dateKey
        })(),
    )

  const getAvailabilityLabel = (records) => {
    if (records.length === 0) return 'Not submitted'
    if (records.some((record) => record.is_off)) return 'Off'
    const intervals = records.filter(
      (record) => record.start_time && record.end_time,
    )
    if (intervals.length === 0) return 'Not submitted'
    return intervals
      .map(
        (record) =>
          `${formatTime(record.start_time)}–${formatTime(record.end_time)}`,
      )
      .join(', ')
  }

  const getShiftWarnings = (shift) => {
    const records = getDayAvailability(shift.employee_id, shift.work_date)
    if (records.length === 0) return ['Availability not submitted for this day.']
    if (records.some((record) => record.is_off)) {
      return ['Employee marked this day off.']
    }

    const start = getMinutes(shift.start_time)
    const end = getMinutes(shift.end_time)
    const fitsInterval = records.some((record) => {
      const availableStart = getMinutes(record.start_time)
      const availableEnd = getMinutes(record.end_time)
      return (
        start !== null &&
        end !== null &&
        availableStart !== null &&
        availableEnd !== null &&
        start >= availableStart &&
        end <= availableEnd
      )
    })
    return fitsInterval ? [] : ['Shift falls outside submitted availability.']
  }

  const saveEditedShift = (values) => {
    if (editing.shift) {
      onUpdateShift(editing.shift.shift_id, values)
    } else {
      onAddShift(values)
    }
    setEditing(null)
  }

  return (
    <div className='space-y-5'>
      <section className='card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='font-semibold text-text-primary'>
            {hasSavedDraft ? 'Draft saved' : 'Draft not saved'}
          </p>
          <p className='mt-1 text-sm text-text-secondary'>
            {hasUnsavedChanges
              ? 'There are changes that have not been saved to the draft.'
              : hasPublishedSchedule && !publishedMatchesDraft
                ? 'The published schedule is unchanged; publish again to share this draft.'
                : hasPublishedSchedule
                  ? 'The current draft matches the published schedule.'
                  : 'Employees will not see this schedule until it is published.'}
          </p>
          {hasUnsavedChanges && (
            <p className='mt-1 text-xs text-amber-700'>
              Save the draft before publishing changes.
            </p>
          )}
        </div>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            onClick={onSaveDraft}
            className='btn-secondary'
          >
            Save Draft
          </button>
          <button
            type='button'
            onClick={onPublish}
            disabled={!hasSavedDraft || hasUnsavedChanges}
            className='btn-primary'
          >
            Publish Schedule
          </button>
        </div>
      </section>

      <section className='space-y-4'>
        {days.map((day) => {
          const dayShifts = shifts
            .filter((shift) => shift.work_date === day.dateKey)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))

          return (
            <article key={day.dateKey} className='card overflow-hidden'>
              <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5'>
                <div>
                  <h2 className='font-semibold text-text-primary'>
                    {day.dayName}
                  </h2>
                  <p className='text-sm text-text-secondary'>
                    {formatDate(day.date)}
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => setEditing({ dateKey: day.dateKey, shift: null })}
                  className='btn-secondary'
                >
                  <CalendarPlusIcon className='size-4' />
                  Add shift
                </button>
              </div>

              <div className='space-y-3 p-4 sm:p-5'>
                {dayShifts.length > 0 ? (
                  <div className='space-y-2'>
                    {dayShifts.map((shift) => {
                      const employee = employees.find(
                        (record) =>
                          record.employee_id === shift.employee_id,
                      )
                      const warnings = getShiftWarnings(shift)

                      return (
                        <div
                          key={shift.shift_id}
                          className='rounded-lg border border-border p-3 sm:flex sm:items-start sm:justify-between sm:gap-4'
                        >
                          <div>
                            <p className='font-medium text-text-primary'>
                              {employee?.full_name ?? 'Employee unavailable'}
                            </p>
                            <p className='mt-1 text-sm text-text-secondary'>
                              {formatTime(shift.start_time)} –{' '}
                              {formatTime(shift.end_time)}
                            </p>
                            {warnings.map((warning) => (
                              <p
                                key={warning}
                                className='mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800'
                              >
                                {warning}
                              </p>
                            ))}
                          </div>
                          <div className='mt-3 flex gap-2 sm:mt-0'>
                            <button
                              type='button'
                              onClick={() => setEditing({ dateKey: day.dateKey, shift })}
                              aria-label={`Edit ${employee?.full_name ?? 'employee'} shift`}
                              className='rounded-lg border border-border p-2 text-text-secondary hover:bg-background'
                            >
                              <PencilIcon className='size-4' />
                            </button>
                            <button
                              type='button'
                              onClick={() => onDeleteShift(shift.shift_id)}
                              aria-label={`Delete ${employee?.full_name ?? 'employee'} shift`}
                              className='rounded-lg border border-border p-2 text-rose-700 hover:bg-rose-50'
                            >
                              <Trash2Icon className='size-4' />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className='rounded-lg bg-background px-4 py-3 text-sm text-text-secondary'>
                    No shifts assigned.
                  </p>
                )}

                <details className='rounded-lg border border-border'>
                  <summary className='cursor-pointer px-4 py-3 text-sm font-medium text-text-primary'>
                    Availability reference
                  </summary>
                  <div className='grid gap-2 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-3'>
                    {employees.map((employee) => {
                      const records = getDayAvailability(
                        employee.employee_id,
                        day.dateKey,
                      )
                      const label = getAvailabilityLabel(records)
                      const isMissing = label === 'Not submitted'
                      const isOff = label === 'Off'

                      return (
                        <div
                          key={employee.employee_id}
                          className={`rounded-md px-3 py-2 text-xs ${isOff ? 'bg-slate-100 text-text-secondary' : isMissing ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}
                        >
                          <span className='font-medium'>
                            {employee.full_name}:{' '}
                          </span>
                          {label}
                        </div>
                      )
                    })}
                  </div>
                </details>
              </div>
            </article>
          )
        })}
      </section>

      {editing && (
        <ShiftEditor
          key={editing.shift?.shift_id ?? `${editing.dateKey}-new`}
          employees={employees}
          shift={editing.shift}
          initialDate={editing.dateKey}
          weekStart={weekStart}
          weekEnd={weekEnd}
          existingShifts={shifts}
          onSave={saveEditedShift}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}

export default ManagerScheduleView
