import { useMemo, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import {
  dummyEmployeeData,
  dummyProfileData,
  dummyUsersData,
} from '../assets/mockup-data'
import ApplyRequestModal from '../components/leave/ApplyRequestModal'
import RequestHistory from '../components/leave/RequestHistory'
import { useAttendancePreview } from '../context/AttendancePreviewContext'

const Request = () => {
  const { role } = useOutletContext()
  const {
    attendanceRecords,
    correctionAudit,
    correctionTargets,
    requests,
    reviewRequest,
    submitRequest,
  } = useAttendancePreview()
  const [showModel, setShowModel] = useState(false)
  const employee = dummyEmployeeData.find(
    (record) => record.user_id === dummyProfileData.user_id,
  )
  const isManager = role === 'MANAGER'
  // Temporary preview assumption, not authenticated identity; replace with the logged-in manager ID.
  const managerUsers = dummyUsersData.filter((user) => user.role === role)
  const managerUser =
    isManager && managerUsers.length === 1 && managerUsers[0].user_id != null
      ? managerUsers[0]
      : null
  const ownRequests = requests.filter(
    (request) => request.employee_id === employee?.employee_id,
  )
  const visibleRequests = isManager ? requests : ownRequests
  const visibleAttendance = attendanceRecords.filter(
    (record) => record.employee_id === employee?.employee_id,
  )
  const visibleAuditRequestIds = useMemo(
    () => new Set(visibleRequests.map((request) => request.request_id)),
    [visibleRequests],
  )
  const visibleCorrectionAudit = correctionAudit.filter((entry) =>
    visibleAuditRequestIds.has(entry.request_id),
  )

  const handleSubmit = (requestData, attendanceId) =>
    employee
      ? submitRequest(requestData, employee.employee_id, attendanceId)
      : { ok: false, message: 'No employee record is available.' }

  const handleReview = (requestId, status) =>
    reviewRequest(requestId, status, managerUser?.user_id)

  if (role !== 'MANAGER' && role !== 'EMPLOYEE') {
    return (
      <p className='py-12 text-center text-text-secondary'>
        Requests are unavailable for this role.
      </p>
    )
  }

  return (
    <div className='animate-fade-in space-y-6'>
      <header className='page-header'>
        <h1 className='page-title'>{isManager ? 'Requests' : 'My Requests'}</h1>
        <p className='page-subtitle'>
          {isManager
            ? 'Review employee requests.'
            : 'Submit and view your requests.'}
        </p>
      </header>

      <p className='rounded-lg border border-gold/30 bg-gold-light/40 px-4 py-3 text-sm text-text-secondary'>
        Preview only: changes are kept in memory and reset when the page reloads.
      </p>

      {!isManager && (
        <div className='mb-6'>
          {employee ? (
            <button
              onClick={() => setShowModel(true)}
              className='btn-primary inline-flex items-center gap-2'
            >
              <PlusIcon className='size-4' />
              Submit a request
            </button>
          ) : (
            <p className='text-sm text-text-secondary'>
              No employee record is available for the current profile.
            </p>
          )}
        </div>
      )}

      <RequestHistory
        requests={visibleRequests}
        employees={dummyEmployeeData}
        users={dummyUsersData}
        isManager={isManager}
        onReview={handleReview}
        correctionTargets={correctionTargets}
        correctionAudit={visibleCorrectionAudit}
      />
      {!isManager && (
        <ApplyRequestModal
          open={showModel}
          onClose={() => setShowModel(false)}
          onSubmit={handleSubmit}
          attendanceRecords={visibleAttendance}
        />
      )}
    </div>
  )
}

export default Request
