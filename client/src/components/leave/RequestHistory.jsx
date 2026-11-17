import { useRef, useState } from 'react'
import { Check, X } from 'lucide-react'

const requestTypeLabels = {
  LEAVE: 'Leave',
  OVERTIME: 'Overtime',
  ATTENDANCE_CORRECTION: 'Attendance correction',
}

const formatDateTime = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return '—'
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T]([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
  )
  if (!match) return '—'
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
    return '—'
  }
  date.setHours(Number(hourText), Number(minuteText), Number(secondText ?? 0), 0)

  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const RequestHistory = ({
  requests,
  employees,
  users,
  isManager,
  onReview,
  correctionTargets = {},
  correctionAudit = [],
}) => {
  const [pendingReview, setPendingReview] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const activeReviewRef = useRef(null)
  const processingRef = useRef(false)

  const confirmReview = () => {
    const review = activeReviewRef.current
    if (!review || processingRef.current) return

    processingRef.current = true
    setIsProcessing(true)
    let result
    try {
      result = onReview(review.requestId, review.status)
    } finally {
      processingRef.current = false
      setIsProcessing(false)
    }
    if (!result?.ok) {
      setReviewError(result?.message ?? 'The request could not be reviewed.')
      return
    }
    activeReviewRef.current = null
    setPendingReview(null)
    setReviewError('')
  }

  const closeReview = () => {
    activeReviewRef.current = null
    processingRef.current = false
    setIsProcessing(false)
    setPendingReview(null)
    setReviewError('')
  }

  const openReview = (requestId, status) => {
    if (processingRef.current) return
    const review = { requestId, status }
    activeReviewRef.current = review
    setIsProcessing(false)
    setReviewError('')
    setPendingReview(review)
  }

  return (
    <>
      <div className='card overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='table-modern'>
            <thead>
              <tr>
                {isManager && <th>Employee</th>}
                <th>Type</th>
                <th>Attendance record</th>
                <th>Start</th>
                <th>End</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Reviewed by</th>
                <th>Reviewed at</th>
                {isManager && <th className='text-center'>Action</th>}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={isManager ? 10 : 8}
                    className='text-center py-12 text-slate-400'
                  >
                    No requests found
                  </td>
                </tr>
              ) : (
                requests.map((request) => {
                  const reviewer = users.find(
                    (user) => user.user_id === request.reviewed_by,
                  )

                  return (
                    <tr key={request.request_id}>
                      {isManager && (
                        <td className='text-slate-900'>
                          {employees.find(
                            (employee) =>
                              employee.employee_id === request.employee_id,
                          )?.full_name ?? '—'}
                        </td>
                      )}
                      <td>
                        <span className='badge bg-slate-100 text-slate-600'>
                          {requestTypeLabels[request.request_type] ??
                            request.request_type}
                        </span>
                      </td>
                      <td className='text-xs text-slate-500'>
                        {request.request_type !== 'ATTENDANCE_CORRECTION'
                          ? '—'
                          : correctionTargets[request.request_id] != null
                            ? `Attendance #${correctionTargets[request.request_id]}`
                            : 'Not linked'}
                      </td>
                      <td className='text-xs text-slate-500'>
                        {formatDateTime(request.start_time)}
                      </td>
                      <td className='text-xs text-slate-500'>
                        {formatDateTime(request.end_time)}
                      </td>
                      <td
                        className='max-w-xs truncate text-slate-500'
                        title={request.reason}
                      >
                        {request.reason}
                      </td>
                      <td>
                        <span
                          className={`badge ${request.status === 'APPROVED' ? 'badge-success' : request.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className='text-xs text-slate-500'>
                        {reviewer?.username ?? request.reviewed_by ?? '—'}
                      </td>
                      <td className='text-xs text-slate-500'>
                        {formatDateTime(request.reviewed_at)}
                      </td>
                      {isManager && (
                        <td>
                          {request.status === 'PENDING' && (
                            <div className='flex justify-center gap-2'>
                              <button
                                type='button'
                                aria-label={`Approve request ${request.request_id}`}
                                onClick={() =>
                                  openReview(request.request_id, 'APPROVED')
                                }
                                disabled={isProcessing}
                                className='p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors'
                              >
                                <Check className='w-4 h-4' />
                              </button>
                              <button
                                type='button'
                                aria-label={`Reject request ${request.request_id}`}
                                onClick={() =>
                                  openReview(request.request_id, 'REJECTED')
                                }
                                disabled={isProcessing}
                                className='p-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors'
                              >
                                <X className='w-4 h-4' />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingReview && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm'
          onClick={closeReview}
        >
          <section
            role='alertdialog'
            aria-modal='true'
            aria-labelledby='review-confirmation-title'
            className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl'
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id='review-confirmation-title'
              className='text-lg font-semibold text-slate-900'
            >
              Confirm {pendingReview.status === 'APPROVED' ? 'approval' : 'rejection'}
            </h2>
            <p className='mt-2 text-sm text-slate-500'>
              Are you sure you want to{' '}
              {pendingReview.status === 'APPROVED' ? 'approve' : 'reject'} this
              request?
            </p>
            {reviewError && (
              <p role='alert' className='mt-3 text-sm text-rose-600'>
                {reviewError}
              </p>
            )}
            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={closeReview}
                disabled={isProcessing}
                className='btn-secondary'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={confirmReview}
                disabled={isProcessing}
                className={
                  pendingReview.status === 'APPROVED'
                    ? 'btn-primary'
                    : 'rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700'
                }
              >
                Confirm {pendingReview.status === 'APPROVED' ? 'approval' : 'rejection'}
              </button>
            </div>
          </section>
        </div>
      )}

      {correctionAudit.length > 0 && (
        <section className='card overflow-hidden'>
          <div className='border-b border-border px-4 py-4 sm:px-6'>
            <h2 className='font-semibold text-text-primary'>
              Attendance correction audit (preview)
            </h2>
          </div>
          <ul className='divide-y divide-border'>
            {correctionAudit.map((entry) => {
              const reviewer = users.find(
                (user) => user.user_id === entry.reviewed_by,
              )
              return (
                <li
                  key={`${entry.request_id}-${entry.attendance_id}`}
                  className='space-y-1 px-4 py-4 text-sm sm:px-6'
                >
                  <p className='font-medium text-text-primary'>
                    Attendance #{entry.attendance_id} · Request #{entry.request_id}
                  </p>
                  <p className='text-text-secondary'>
                    Before: {formatDateTime(entry.original_values.check_in)} –{' '}
                    {formatDateTime(entry.original_values.check_out)}
                  </p>
                  <p className='text-text-secondary'>
                    After: {formatDateTime(entry.updated_values.check_in)} –{' '}
                    {formatDateTime(entry.updated_values.check_out)}
                  </p>
                  <p className='text-text-secondary'>
                    Reviewed by {reviewer?.username ?? entry.reviewed_by ?? '—'} at{' '}
                    {formatDateTime(entry.reviewed_at)} · Reason: {entry.reason}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}

export default RequestHistory
