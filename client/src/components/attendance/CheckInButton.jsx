import { useState } from 'react'
import { LogInIcon, LogOutIcon } from 'lucide-react'

const CheckInButton = ({
  openRecord,
  assignedShifts,
  onCheckIn,
  onCheckOut,
}) => {
  const [feedback, setFeedback] = useState(null)
  const [selectedShiftId, setSelectedShiftId] = useState('')
  const hasOpenSession = Boolean(openRecord)
  const selectedShift =
    assignedShifts.find(
      (shift) => shift.shift_id === Number(selectedShiftId),
    ) ?? assignedShifts[0]
  const canCheckIn = hasOpenSession || Boolean(selectedShift)

  const handleAction = () => {
    setFeedback(null)
    const result = hasOpenSession ? onCheckOut() : onCheckIn(selectedShift)
    setFeedback(result)
  }

  return (
    <section className='card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
      <div>
        <h2 className='font-semibold text-text-primary'>
          {hasOpenSession ? 'Attendance session in progress' : 'Today'}
        </h2>
        <p className='mt-1 text-sm text-text-secondary'>
          {hasOpenSession
            ? `Checked in at ${openRecord.check_in ?? 'time unavailable'}.`
            : selectedShift
              ? `Published shift #${selectedShift.shift_id}: ${selectedShift.start_time}–${selectedShift.end_time}.`
              : 'No published shift is assigned to you for today. Check-in is unavailable.'}
        </p>
        {!hasOpenSession && assignedShifts.length > 1 && (
          <label className='mt-3 flex max-w-sm flex-col gap-1 text-sm text-text-secondary'>
            Shift for today
            <select
              value={selectedShift?.shift_id ?? ''}
              onChange={(event) => setSelectedShiftId(event.target.value)}
            >
              {assignedShifts.map((shift) => (
                <option key={shift.shift_id} value={shift.shift_id}>
                  Shift #{shift.shift_id} · {shift.start_time}–{shift.end_time}
                </option>
              ))}
            </select>
          </label>
        )}
        {feedback && (
          <p
            role={feedback.ok ? 'status' : 'alert'}
            className={`mt-2 text-sm ${feedback.ok ? 'text-emerald-700' : 'text-rose-600'}`}
          >
            {feedback.message}
          </p>
        )}
      </div>
      <button
        type='button'
        onClick={handleAction}
        disabled={!canCheckIn}
        className='btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50'
      >
        {hasOpenSession ? (
          <>
            <LogOutIcon className='size-4' />
            Check out
          </>
        ) : (
          <>
            <LogInIcon className='size-4' />
            Check in
          </>
        )}
      </button>
    </section>
  )
}

export default CheckInButton
