import { useState } from 'react'
import { XIcon } from 'lucide-react'
import { createShiftEditorSchema } from '../../schemas/shiftSchema'

const toTimeInput = (value) =>
  typeof value === 'string' ? value.slice(0, 5) : ''

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
  const [validationErrors, setValidationErrors] = useState({})

  const clearFieldError = (fieldName) => {
    const fieldsToClear =
      fieldName === 'start_time'
        ? ['start_time', 'end_time', 'shift']
        : [fieldName, 'shift']
    setValidationErrors((currentErrors) => {
      if (!fieldsToClear.some((field) => currentErrors[field])) {
        return currentErrors
      }
      const nextErrors = { ...currentErrors }
      fieldsToClear.forEach((field) => delete nextErrors[field])
      return nextErrors
    })
  }

  const getValidationErrors = (issues) =>
    issues.reduce((errors, issue) => {
      const field = issue.path[0]
      if (typeof field === 'string' && !errors[field]) {
        errors[field] = issue.message
      }
      return errors
    }, {})

  const renderFieldError = (fieldName) =>
    validationErrors[fieldName] ? (
      <p role='alert' className='mt-1 text-xs text-rose-700'>
        {validationErrors[fieldName]}
      </p>
    ) : null

  const handleSubmit = (event) => {
    event.preventDefault()
    const schema = createShiftEditorSchema({
      employees,
      weekStart,
      weekEnd,
      existingShifts,
      excludedShiftId: shift?.shift_id,
    })
    const result = schema.safeParse({
      employee_id: employeeId,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
    })
    if (!result.success) {
      setValidationErrors(getValidationErrors(result.error.issues))
      return
    }

    setValidationErrors({})
    onSave({
      ...result.data,
      start_time: `${result.data.start_time}:00`,
      end_time: `${result.data.end_time}:00`,
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
          <div>
            <label className='block text-sm font-medium text-text-secondary'>
              Employee
              <select
                value={employeeId}
                onChange={(event) => {
                  setEmployeeId(event.target.value)
                  clearFieldError('employee_id')
                }}
                className='mt-1'
                required
                aria-invalid={Boolean(validationErrors.employee_id)}
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
            {renderFieldError('employee_id')}
          </div>

          <div>
            <label className='block text-sm font-medium text-text-secondary'>
              Work date
              <input
                type='date'
                value={workDate}
                min={weekStart}
                max={weekEnd}
                onChange={(event) => {
                  setWorkDate(event.target.value)
                  clearFieldError('work_date')
                }}
                className='mt-1'
                required
                aria-invalid={Boolean(validationErrors.work_date)}
              />
            </label>
            {renderFieldError('work_date')}
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div>
              <label className='block text-sm font-medium text-text-secondary'>
                Start time
                <input
                  type='time'
                  value={startTime}
                  onChange={(event) => {
                    setStartTime(event.target.value)
                    clearFieldError('start_time')
                  }}
                  className='mt-1'
                  required
                  aria-invalid={Boolean(validationErrors.start_time)}
                />
              </label>
              {renderFieldError('start_time')}
            </div>
            <div>
              <label className='block text-sm font-medium text-text-secondary'>
                End time
                <input
                  type='time'
                  value={endTime}
                  onChange={(event) => {
                    setEndTime(event.target.value)
                    clearFieldError('end_time')
                  }}
                  className='mt-1'
                  required
                  aria-invalid={Boolean(validationErrors.end_time)}
                />
              </label>
              {renderFieldError('end_time')}
            </div>
          </div>

          {employees.length === 0 && (
            <p className='text-sm text-text-secondary'>
              No employee records are available.
            </p>
          )}
          {validationErrors.shift && (
            <p role='alert' className='rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {validationErrors.shift}
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
