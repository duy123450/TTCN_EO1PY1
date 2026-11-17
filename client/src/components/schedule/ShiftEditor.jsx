import { useState } from 'react'
import { XIcon } from 'lucide-react'

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

const toTimeInput = (value) =>
  typeof value === 'string' ? value.slice(0, 5) : ''

const toMinutes = (value) => {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

const ShiftEditor = ({
  employees,
  shift,
  initialDate,
  weekStart,
  weekEnd,
  existingShifts,
  onSave,
  onCancel,
}) => {
  const [employeeId, setEmployeeId] = useState(
    shift?.employee_id == null ? '' : String(shift.employee_id),
  )
  const [workDate, setWorkDate] = useState(shift?.work_date ?? initialDate)
  const [startTime, setStartTime] = useState(toTimeInput(shift?.start_time))
  const [endTime, setEndTime] = useState(toTimeInput(shift?.end_time))
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()

    const employee = employees.find(
      (record) => String(record.employee_id) === employeeId,
    )
    if (!employee) {
      setError('Select an employee for this shift.')
      return
    }
    if (!isValidDate(workDate)) {
      setError('Enter a valid work date.')
      return
    }
    if (workDate < weekStart || workDate > weekEnd) {
      setError('The work date must be within the selected week.')
      return
    }

    const startMinutes = toMinutes(startTime)
    const endMinutes = toMinutes(endTime)
    if (startMinutes === null || endMinutes === null) {
      setError('Enter a valid start time and end time.')
      return
    }
    if (endMinutes <= startMinutes) {
      setError('The end time must be later than the start time. Overnight shifts are not allowed.')
      return
    }

    const overlaps = existingShifts.some((existingShift) => {
      if (
        existingShift.shift_id === shift?.shift_id ||
        existingShift.employee_id !== employee.employee_id ||
        existingShift.work_date !== workDate
      ) {
        return false
      }

      const existingStart = toMinutes(toTimeInput(existingShift.start_time))
      const existingEnd = toMinutes(toTimeInput(existingShift.end_time))
      return (
        existingStart !== null &&
        existingEnd !== null &&
        startMinutes < existingEnd &&
        endMinutes > existingStart
      )
    })
    if (overlaps) {
      setError('This shift overlaps another shift assigned to the same employee on this date.')
      return
    }

    onSave({
      employee_id: employee.employee_id,
      work_date: workDate,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
    })
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4'
      onClick={onCancel}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='shift-editor-title'
        className='my-auto w-full max-w-lg rounded-xl bg-surface p-5 shadow-2xl sm:p-6'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='mb-5 flex items-start justify-between gap-4'>
          <div>
            <h2
              id='shift-editor-title'
              className='text-lg font-semibold text-text-primary'
            >
              {shift ? 'Edit shift' : 'Add shift'}
            </h2>
            <p className='mt-1 text-sm text-text-secondary'>
              Shift times must start and end on the same day.
            </p>
          </div>
          <button
            type='button'
            onClick={onCancel}
            aria-label='Close shift editor'
            className='rounded-lg p-2 text-text-secondary hover:bg-background'
          >
            <XIcon className='size-5' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <label className='block text-sm font-medium text-text-secondary'>
            Employee
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className='mt-1'
              required
            >
              <option value=''>Select employee</option>
              {employees.map((employee) => (
                <option
                  key={employee.employee_id}
                  value={employee.employee_id}
                >
                  {employee.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className='block text-sm font-medium text-text-secondary'>
            Work date
            <input
              type='date'
              value={workDate}
              min={weekStart}
              max={weekEnd}
              onChange={(event) => setWorkDate(event.target.value)}
              className='mt-1'
              required
            />
          </label>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <label className='block text-sm font-medium text-text-secondary'>
              Start time
              <input
                type='time'
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className='mt-1'
                required
              />
            </label>
            <label className='block text-sm font-medium text-text-secondary'>
              End time
              <input
                type='time'
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className='mt-1'
                required
              />
            </label>
          </div>

          {employees.length === 0 && (
            <p className='text-sm text-text-secondary'>
              No employee records are available.
            </p>
          )}
          {error && (
            <p role='alert' className='rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {error}
            </p>
          )}

          <div className='flex justify-end gap-2 pt-2'>
            <button
              type='button'
              onClick={onCancel}
              className='btn-secondary'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={employees.length === 0}
              className='btn-primary'
            >
              {shift ? 'Save changes' : 'Add shift'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ShiftEditor
