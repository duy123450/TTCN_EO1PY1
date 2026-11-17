import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  dummyEmployeeData,
  dummyProfileData,
  dummyShiftData,
} from '../assets/mockup-data'
import AttendanceHistory from '../components/attendance/AttendanceHistory'
import AttendanceStats from '../components/attendance/AttendanceStats'
import CheckInButton from '../components/attendance/CheckInButton'
import ManagerAttendanceView from '../components/attendance/ManagerAttendanceView'
import { useAttendancePreview } from '../context/AttendancePreviewContext'

const getDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const getWeekStart = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  const monday = new Date(year, month - 1, day)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return getDateKey(monday)
}

const Attendance = () => {
  const { role } = useOutletContext()
  const {
    attendanceRecords,
    publishedShiftsByWeek,
    checkIn,
    checkOut,
  } = useAttendancePreview()
  const employee = dummyEmployeeData.find(
    (record) => record.user_id === dummyProfileData.user_id,
  )

  const today = getDateKey(new Date())
  const todayPublishedShifts =
    publishedShiftsByWeek[getWeekStart(today)] ?? []
  const assignedShifts = todayPublishedShifts.filter(
    (shift) =>
      shift.employee_id === employee?.employee_id && shift.work_date === today,
  )
  const ownHistory = useMemo(
    () =>
      attendanceRecords
        .filter((record) => record.employee_id === employee?.employee_id)
        .sort((a, b) => (b.check_in ?? '').localeCompare(a.check_in ?? '')),
    [attendanceRecords, employee?.employee_id],
  )
  const openRecord = ownHistory.find(
    (record) => record.check_out == null || record.check_out === '',
  )

  if (role === 'MANAGER') {
    return (
      <ManagerAttendanceView
        attendanceRecords={attendanceRecords}
        employees={dummyEmployeeData}
        shifts={dummyShiftData}
      />
    )
  }

  if (role !== 'EMPLOYEE') {
    return (
      <p className='py-12 text-center text-text-secondary'>
        Attendance is unavailable for this role.
      </p>
    )
  }

  return (
    <div className='animate-fade-in space-y-6'>
      <header className='page-header'>
        <h1 className='page-title'>Attendance</h1>
        <p className='page-subtitle'>
          Record and review your check-in and check-out times.
        </p>
      </header>

      <p className='rounded-lg border border-gold/30 bg-gold-light/40 px-4 py-3 text-sm text-text-secondary'>
        Preview only: timestamps use this browser&apos;s local clock and are not
        verified by a server. Changes reset when the page reloads.
      </p>

      {!employee ? (
        <p className='card p-6 text-center text-sm text-text-secondary'>
          No employee record is available for the current profile.
        </p>
      ) : (
        <>
          <CheckInButton
            openRecord={openRecord}
            assignedShifts={assignedShifts}
            onCheckIn={(shift) => checkIn(employee.employee_id, shift)}
            onCheckOut={() => checkOut(employee.employee_id)}
          />
          <AttendanceStats history={ownHistory} />
          <AttendanceHistory history={ownHistory} />
        </>
      )}
    </div>
  )
}

export default Attendance
