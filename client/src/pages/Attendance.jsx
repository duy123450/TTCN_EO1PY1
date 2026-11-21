import { useCallback, useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import {
  attendanceCheckInBodySchema,
  employeeAttendanceQuerySchema,
  managerAttendanceQuerySchema,
} from '../schemas/attendanceSchema'
import AttendanceHistory from '../components/attendance/AttendanceHistory'
import AttendanceStats from '../components/attendance/AttendanceStats'
import CheckInButton from '../components/attendance/CheckInButton'
import ManagerAttendanceView from '../components/attendance/ManagerAttendanceView'

const getVietnamDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

const getVietnamWeek = (dateKey) => {
  const date = parseDateKey(dateKey)
  const mondayOffset = (date.getUTCDay() + 6) % 7
  const monday = new Date(date)
  monday.setUTCDate(monday.getUTCDate() - mondayOffset)
  const sunday = new Date(monday)
  sunday.setUTCDate(sunday.getUTCDate() + 6)
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  }
}

const getRecordDateKey = (value) => {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error.message ||
  fallback

const getCurrentWeek = () => getVietnamWeek(getVietnamDateKey())

const todayAtVietnam = getVietnamDateKey()

const sortAttendance = (records) =>
  [...records].sort((a, b) =>
    (b.check_in ?? '').localeCompare(a.check_in ?? ''),
  )

const getAttendanceParams = (startDate = '', endDate = '', employeeId = '') => {
  const params = {}
  if (startDate) params.start_date = startDate
  if (endDate) params.end_date = endDate
  if (employeeId) params.employee_id = employeeId
  return params
}

const Attendance = () => {
  const { user } = useAuth()
  const role = user?.role
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [assignedShifts, setAssignedShifts] = useState([])
  const [managerEmployees, setManagerEmployees] = useState([])
  const [managerShifts, setManagerShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionProcessing, setActionProcessing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [employeeStartDate, setEmployeeStartDate] = useState('')
  const [employeeEndDate, setEmployeeEndDate] = useState('')

  const openRecord = attendanceRecords.find(
    (record) => record.check_out == null || record.check_out === '',
  )

  const loadEmployeeAttendance = useCallback(
    async (startDate = '', endDate = '') => {
      setLoading(true)
      setLoadError('')

      const query = employeeAttendanceQuerySchema.safeParse({
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      })
      if (!query.success) {
        setLoadError(query.error.issues[0]?.message || 'Invalid attendance filters.')
        setLoading(false)
        return
      }

      const { weekStart, weekEnd } = getCurrentWeek()
      try {
        const [attendanceResponse, shiftsResponse] = await Promise.all([
          api.get('/attendance', { params: getAttendanceParams(startDate, endDate) }),
          api.get('/shifts', {
            params: { week_start: weekStart, week_end: weekEnd },
          }),
        ])
        const records = attendanceResponse?.data?.data
        const shifts = shiftsResponse?.data?.data
        if (!Array.isArray(records) || !Array.isArray(shifts)) {
          throw new Error('The server returned invalid attendance data.')
        }
        setAttendanceRecords(sortAttendance(records))
        setAssignedShifts(
          shifts.filter((shift) =>
            shift.shift_status === 'PUBLISHED' &&
            shift.work_date === todayAtVietnam,
          ),
        )
      } catch (error) {
        setLoadError(
          getApiErrorMessage(error, 'Unable to load attendance. Please try again.'),
        )
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const loadManagerAttendance = useCallback(
    async (startDate = '', endDate = '', employeeId = '') => {
      setLoading(true)
      setLoadError('')

      const query = managerAttendanceQuerySchema.safeParse({
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        ...(employeeId ? { employee_id: employeeId } : {}),
      })
      if (!query.success) {
        setLoadError(query.error.issues[0]?.message || 'Invalid attendance filters.')
        setLoading(false)
        return
      }

      try {
        const attendanceParams = getAttendanceParams(
          startDate,
          endDate,
          employeeId,
        )
        const [attendanceResponse, employeesResponse] = await Promise.all([
          api.get('/attendance', { params: attendanceParams }),
          api.get('/employees'),
        ])
        const records = attendanceResponse?.data?.data
        const employees = employeesResponse?.data?.data
        if (!Array.isArray(records) || !Array.isArray(employees)) {
          throw new Error('The server returned invalid manager attendance data.')
        }

        setAttendanceRecords(sortAttendance(records))
        setManagerEmployees(employees)

        const recordDates = records
          .map((record) => getRecordDateKey(record.check_in))
          .filter(Boolean)
          .sort()
        const fallbackWeek = getCurrentWeek()
        let weekStart = startDate || recordDates[0] || fallbackWeek.weekStart
        let weekEnd = endDate || recordDates.at(-1) || fallbackWeek.weekEnd
        if (weekStart > weekEnd) {
          weekStart = fallbackWeek.weekStart
          weekEnd = fallbackWeek.weekEnd
        }

        const shiftParams = {
          week_start: weekStart,
          week_end: weekEnd,
          ...(employeeId ? { employee_id: employeeId } : {}),
        }
        const shiftsResponse = await api.get('/shifts', { params: shiftParams })
        const shifts = shiftsResponse?.data?.data
        if (!Array.isArray(shifts)) {
          throw new Error('The server returned invalid shift data.')
        }

        const shiftsById = new Map(
          shifts.map((shift) => [String(shift.shift_id), shift]),
        )
        const missingShiftIds = [
          ...new Set(
            records
              .map((record) => record.shift_id)
              .filter(
                (shiftId) =>
                  shiftId != null && !shiftsById.has(String(shiftId)),
              ),
          ),
        ]
        const missingShifts = await Promise.all(
          missingShiftIds.map(async (shiftId) => {
            try {
              const response = await api.get(`/shifts/${shiftId}`)
              const shift = response?.data?.data
              if (!shift || String(shift.shift_id) !== String(shiftId)) {
                console.warn(`Unable to load details for shift ${shiftId}.`)
                return null
              }
              return shift
            } catch (error) {
              console.warn(`Unable to load details for shift ${shiftId}.`, error)
              return null
            }
          }),
        )
        missingShifts.forEach((shift) => {
          if (shift) shiftsById.set(String(shift.shift_id), shift)
        })
        setManagerShifts([...shiftsById.values()])
      } catch (error) {
        setLoadError(
          getApiErrorMessage(error, 'Unable to load attendance. Please try again.'),
        )
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!user || !role) return
    let active = true
    Promise.resolve().then(() => {
      if (!active) return
      if (role === 'EMPLOYEE') {
        loadEmployeeAttendance()
      } else if (role === 'MANAGER') {
        loadManagerAttendance()
      } else {
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [loadEmployeeAttendance, loadManagerAttendance, role, user])

  const handleCheckIn = async (shift) => {
    if (actionProcessing || !shift) return
    const validation = attendanceCheckInBodySchema.safeParse({
      shift_id: shift.shift_id,
    })
    if (!validation.success) {
      return {
        ok: false,
        message: validation.error.issues[0]?.message || 'Invalid shift.',
      }
    }

    setActionProcessing(true)
    try {
      await api.post('/attendance/check-in', validation.data)
      await loadEmployeeAttendance(employeeStartDate, employeeEndDate)
      return { ok: true, message: 'Check-in recorded successfully.' }
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, 'Unable to record check-in.'),
      }
    } finally {
      setActionProcessing(false)
    }
  }

  const handleCheckOut = async () => {
    if (actionProcessing) return
    setActionProcessing(true)
    try {
      await api.post('/attendance/check-out', {})
      await loadEmployeeAttendance(employeeStartDate, employeeEndDate)
      return { ok: true, message: 'Check-out recorded successfully.' }
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, 'Unable to record check-out.'),
      }
    } finally {
      setActionProcessing(false)
    }
  }

  if (role === 'MANAGER') {
    return (
      <ManagerAttendanceView
        attendanceRecords={attendanceRecords}
        employees={managerEmployees}
        shifts={managerShifts}
        loading={loading}
        error={loadError}
        onApplyFilters={(filters) =>
          loadManagerAttendance(
            filters.startDate,
            filters.endDate,
            filters.employeeId,
          )
        }
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

      <section className='card flex flex-col gap-3 p-4 sm:flex-row sm:items-end'>
        <label className='flex flex-col gap-1 text-sm text-text-secondary'>
          Start date
          <input
            type='date'
            value={employeeStartDate}
            onChange={(event) => setEmployeeStartDate(event.target.value)}
          />
        </label>
        <label className='flex flex-col gap-1 text-sm text-text-secondary'>
          End date
          <input
            type='date'
            value={employeeEndDate}
            onChange={(event) => setEmployeeEndDate(event.target.value)}
          />
        </label>
        <button
          type='button'
          className='btn-secondary'
          disabled={loading}
          onClick={() =>
            loadEmployeeAttendance(employeeStartDate, employeeEndDate)
          }
        >
          Apply filters
        </button>
      </section>

      {loadError && (
        <p role='alert' className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {loadError}
        </p>
      )}

      {loading ? (
        <p className='card p-6 text-center text-sm text-text-secondary'>
          Loading attendance...
        </p>
      ) : (
        <>
          <CheckInButton
            openRecord={openRecord}
            assignedShifts={assignedShifts}
            processing={actionProcessing}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
          <AttendanceStats history={attendanceRecords} />
          <AttendanceHistory history={attendanceRecords} />
        </>
      )}
    </div>
  )
}

export default Attendance
