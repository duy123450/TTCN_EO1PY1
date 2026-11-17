import { CalendarDays, FileText, Send, X } from 'lucide-react'
import { useState } from 'react'

const initialForm = {
  request_type: 'LEAVE',
  start_time: '',
  end_time: '',
  reason: '',
}

const requestTypes = [
  { value: 'LEAVE', label: 'Leave' },
  { value: 'OVERTIME', label: 'Overtime' },
  { value: 'ATTENDANCE_CORRECTION', label: 'Attendance correction' },
]

const parseDateTime = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return null
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
  )
  if (!match) return null
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  date.setHours(Number(hourText), Number(minuteText), Number(secondText ?? 0), 0)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatAttendanceOption = (record) => {
  const checkIn =
    typeof record.check_in === 'string' && record.check_in.trim()
      ? record.check_in.replace('T', ' ')
      : 'Check-in unavailable'
  const checkOut =
    typeof record.check_out === 'string' && record.check_out.trim()
      ? record.check_out.replace('T', ' ')
      : 'Missing check-out'
  return `Attendance #${record.attendance_id} · ${checkIn} – ${checkOut}`
}

const ApplyRequestModal = ({
  open,
  onClose,
  onSubmit,
  attendanceRecords = [],
}) => {
  const [form, setForm] = useState(initialForm)
  const [dateRangeError, setDateRangeError] = useState(false)
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('')
  const [submitError, setSubmitError] = useState('')

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
    setDateRangeError(false)
    setSubmitError('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const startTime = parseDateTime(form.start_time)?.getTime()
    const endTime = parseDateTime(form.end_time)?.getTime()

    if (
      !Number.isFinite(startTime) ||
      !Number.isFinite(endTime) ||
      endTime <= startTime
    ) {
      setDateRangeError(true)
      return
    }

    if (
      form.request_type === 'ATTENDANCE_CORRECTION' &&
      !attendanceRecords.some(
        (record) => record.attendance_id === Number(selectedAttendanceId),
      )
    ) {
      setSubmitError('Select an attendance record to correct.')
      return
    }

    const result = onSubmit(form, selectedAttendanceId)
    if (!result?.ok) {
      setSubmitError(result?.message ?? 'The request could not be submitted.')
      return
    }

    setForm({ ...initialForm })
    setDateRangeError(false)
    setSelectedAttendanceId('')
    setSubmitError('')
    onClose()
  }

  if (!open) return null

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm'
      onClick={onClose}
    >
      <div
        className='relative w-full max-w-lg animate-fade-in rounded-2xl bg-white shadow-2xl'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex items-center justify-between p-6 pb-0'>
          <div>
            <h2 className='text-lg font-semibold'>Submit a Request</h2>
            <p className='mt-0.5 text-sm text-slate-400'>
              Submit your request for approval
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600'
            aria-label='Close request form'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-5 p-6'>
          <div>
            <label className='mb-2 flex items-center gap-2 text-sm font-medium text-slate-700'>
              <FileText className='h-4 w-4 text-slate-400' /> Request Type
            </label>
            <select
              name='request_type'
              value={form.request_type}
              onChange={updateField}
              required
            >
              {requestTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {form.request_type === 'ATTENDANCE_CORRECTION' && (
            <div>
              <label className='mb-2 block text-sm font-medium text-slate-700'>
                Attendance record
              </label>
              {attendanceRecords.length > 0 ? (
                <select
                  required
                  value={selectedAttendanceId}
                  onChange={(event) => {
                    setSelectedAttendanceId(event.target.value)
                    setSubmitError('')
                  }}
                >
                  <option value=''>Select a record</option>
                  {attendanceRecords.map((record) => (
                    <option
                      key={record.attendance_id}
                      value={record.attendance_id}
                    >
                      {formatAttendanceOption(record)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className='text-sm text-slate-500'>
                  There are no attendance records available to correct.
                </p>
              )}
            </div>
          )}

          <div>
            <label className='mb-2 flex items-center gap-2 text-sm font-medium text-slate-700'>
              <CalendarDays className='h-4 w-4 text-slate-400' /> Duration
            </label>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <span className='mb-1 block text-xs text-slate-400'>From</span>
                <input
                  type='datetime-local'
                  name='start_time'
                  value={form.start_time}
                  onChange={updateField}
                  required
                />
              </div>
              <div>
                <span className='mb-1 block text-xs text-slate-400'>To</span>
                <input
                  type='datetime-local'
                  name='end_time'
                  value={form.end_time}
                  onChange={updateField}
                  min={form.start_time || undefined}
                  required
                />
              </div>
            </div>
            {dateRangeError && (
              <p role='alert' className='mt-2 text-sm text-rose-600'>
                Enter valid times, and make sure the end time is later than the
                start time.
              </p>
            )}
          </div>

          <div>
            <label className='mb-2 flex items-center gap-2 text-sm font-medium text-slate-700'>
              Reason
            </label>
            <textarea
              name='reason'
              value={form.reason}
              onChange={updateField}
              required
              rows={3}
              className='resize-none'
              placeholder='Briefly describe your request...'
            />
          </div>

          {submitError && (
            <p role='alert' className='text-sm text-rose-600'>
              {submitError}
            </p>
          )}

          <div className='flex gap-3 pt-2'>
            <button
              onClick={onClose}
              type='button'
              className='btn-secondary flex-1'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='btn-primary flex flex-1 items-center justify-center gap-2'
            >
              <Send className='h-4 w-4' />
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApplyRequestModal