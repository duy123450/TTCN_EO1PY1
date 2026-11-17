import { useRef, useState } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'

const makeDraft = (records) => {
  const draft = Array.from({ length: 7 }, () => ({
    isOff: false,
    intervals: [],
  }))

  records.forEach((record) => {
    const day = draft[record.day_of_week - 1]
    if (!day) return

    if (record.is_off) {
      day.isOff = true
      day.intervals = []
    } else if (record.start_time && record.end_time && !day.isOff) {
      day.intervals.push({
        key: `saved-${record.availability_id}`,
        start_time: record.start_time.slice(0, 5),
        end_time: record.end_time.slice(0, 5),
      })
    }
  })

  return draft
}

const AvailabilityForm = ({
  employee,
  records,
  dayNames,
  onSave,
}) => {
  const [days, setDays] = useState(() => makeDraft(records))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const intervalKey = useRef(0)

  const updateDay = (dayIndex, update) => {
    setDays((currentDays) =>
      currentDays.map((day, index) =>
        index === dayIndex ? update(day) : day,
      ),
    )
    setError('')
    setSaved(false)
  }

  const addInterval = (dayIndex) => {
    updateDay(dayIndex, (day) => ({
      isOff: false,
      intervals: [
        ...day.intervals,
        {
          key: `new-${intervalKey.current++}`,
          start_time: '',
          end_time: '',
        },
      ],
    }))
  }

  const updateInterval = (dayIndex, intervalKeyToUpdate, field, value) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      intervals: day.intervals.map((interval) =>
        interval.key === intervalKeyToUpdate
          ? { ...interval, [field]: value }
          : interval,
      ),
    }))
  }

  const removeInterval = (dayIndex, intervalKeyToRemove) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      intervals: day.intervals.filter(
        (interval) => interval.key !== intervalKeyToRemove,
      ),
    }))
  }

  const setDayOff = (dayIndex, isOff) => {
    updateDay(dayIndex, (day) => ({
      isOff,
      intervals: isOff ? [] : day.intervals,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      const day = days[dayIndex]
      if (day.isOff && day.intervals.length > 0) {
        setError(`${dayNames[dayIndex]} cannot be off and available.`)
        return
      }

      const sortedIntervals = [...day.intervals].sort((a, b) =>
        a.start_time.localeCompare(b.start_time),
      )

      for (let index = 0; index < sortedIntervals.length; index += 1) {
        const interval = sortedIntervals[index]
        if (!interval.start_time || !interval.end_time) {
          setError(`Enter both times for every ${dayNames[dayIndex]} interval.`)
          return
        }
        if (interval.start_time >= interval.end_time) {
          setError(
            `${dayNames[dayIndex]} intervals must end after they start.`,
          )
          return
        }
        if (
          index > 0 &&
          interval.start_time < sortedIntervals[index - 1].end_time
        ) {
          setError(`${dayNames[dayIndex]} intervals cannot overlap.`)
          return
        }
      }
    }

    const updatedRecords = days.flatMap((day, index) => {
      if (day.isOff) {
        return [
          {
            day_of_week: index + 1,
            start_time: null,
            end_time: null,
            is_off: true,
          },
        ]
      }

      return day.intervals.map((interval) => ({
        day_of_week: index + 1,
        start_time: `${interval.start_time}:00`,
        end_time: `${interval.end_time}:00`,
        is_off: false,
      }))
    })

    onSave(updatedRecords)
    setError('')
    setSaved(true)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-6'
    >
      <div>
        <h2 className='font-semibold text-text-primary'>
          Availability for {employee.full_name}
        </h2>
        <p className='mt-1 text-sm text-text-secondary'>
          Add one or more time intervals for each available day, or mark the day
          off. Leave a day unchanged if you have not submitted availability for
          it.
        </p>
      </div>

      {dayNames.map((dayName, dayIndex) => {
        const day = days[dayIndex]
        return (
          <section
            key={dayName}
            className='rounded-lg border border-border p-4'
          >
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <h3 className='font-medium text-text-primary'>{dayName}</h3>
              <label className='flex items-center gap-2 text-sm text-text-secondary'>
                <input
                  type='checkbox'
                  checked={day.isOff}
                  onChange={(event) => setDayOff(dayIndex, event.target.checked)}
                  className='size-4 accent-brand'
                />
                Mark day off
              </label>
            </div>

            {day.isOff ? (
              <p className='mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-text-secondary'>
                Not available this day.
              </p>
            ) : (
              <div className='mt-3 space-y-3'>
                {day.intervals.map((interval, intervalIndex) => (
                  <div
                    key={interval.key}
                    className='flex flex-col gap-2 sm:flex-row sm:items-end'
                  >
                    <label className='flex-1 text-xs font-medium text-text-secondary'>
                      Interval {intervalIndex + 1} start
                      <input
                        type='time'
                        value={interval.start_time}
                        onChange={(event) =>
                          updateInterval(
                            dayIndex,
                            interval.key,
                            'start_time',
                            event.target.value,
                          )
                        }
                        className='mt-1 w-full'
                      />
                    </label>
                    <label className='flex-1 text-xs font-medium text-text-secondary'>
                      End
                      <input
                        type='time'
                        value={interval.end_time}
                        onChange={(event) =>
                          updateInterval(
                            dayIndex,
                            interval.key,
                            'end_time',
                            event.target.value,
                          )
                        }
                        className='mt-1 w-full'
                      />
                    </label>
                    <button
                      type='button'
                      onClick={() => removeInterval(dayIndex, interval.key)}
                      aria-label={`Remove ${dayName} interval ${intervalIndex + 1}`}
                      className='inline-flex items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:bg-slate-50'
                    >
                      <Trash2Icon className='size-4' />
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type='button'
                  onClick={() => addInterval(dayIndex)}
                  className='inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline'
                >
                  <PlusIcon className='size-4' />
                  Add interval
                </button>
              </div>
            )}
          </section>
        )
      })}

      {error && (
        <p role='alert' className='rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {error}
        </p>
      )}
      {saved && (
        <p role='status' className='rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          Availability saved for the selected week.
        </p>
      )}
      <div className='flex justify-end'>
        <button type='submit' className='btn-primary'>
          Save availability
        </button>
      </div>
    </form>
  )
}

export default AvailabilityForm
