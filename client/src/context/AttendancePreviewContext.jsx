import { createContext, useContext, useRef, useState } from 'react'
import {
  dummyAttendanceData,
  dummyRequestData,
} from '../assets/mockup-data'

const AttendancePreviewContext = createContext(null)

const cloneRecords = (records) => records.map((record) => ({ ...record }))

const getLocalDateTime = (date) => {
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const timePart = [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join(':')
  return `${datePart} ${timePart}`
}

const parseDateTime = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return null
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T]([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
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

const normalizeDateTime = (value) => {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace('T', ' ')
  return normalized.length === 16 ? `${normalized}:00` : normalized
}

const createInitialState = () => ({
  attendanceRecords: cloneRecords(dummyAttendanceData),
  requests: cloneRecords(dummyRequestData),
  correctionTargets: {},
  correctionAudit: [],
  publishedShiftsByWeek: {},
})

export const AttendancePreviewProvider = ({ children }) => {
  const [preview, setPreview] = useState(createInitialState)
  const previewRef = useRef(preview)

  const updatePreview = (update) => {
    const nextPreview = update(previewRef.current)
    previewRef.current = nextPreview
    setPreview(nextPreview)
    return nextPreview
  }

  const checkIn = (employeeId, shift) => {
    const currentPreview = previewRef.current
    if (
      currentPreview.attendanceRecords.some(
        (record) =>
          record.employee_id === employeeId &&
          (record.check_out == null || record.check_out === ''),
      )
    ) {
      return { ok: false, message: 'You already have an open attendance session.' }
    }

    const now = new Date()
    const today = getLocalDateTime(now).slice(0, 10)
    if (
      !shift ||
      shift.employee_id !== employeeId ||
      shift.work_date !== today
    ) {
      return {
        ok: false,
        message: 'Check-in requires your assigned shift to be published for today.',
      }
    }

    const attendanceId =
      Math.max(
        0,
        ...currentPreview.attendanceRecords.map(
          (record) => record.attendance_id,
        ),
      ) + 1
    const record = {
      attendance_id: attendanceId,
      employee_id: employeeId,
      shift_id: shift.shift_id,
      check_in: getLocalDateTime(now),
      check_out: null,
      working_minutes: null,
      attendance_status: null,
      note: null,
    }

    updatePreview((current) => ({
      ...current,
      attendanceRecords: [...current.attendanceRecords, record],
    }))
    return { ok: true, message: 'Check-in recorded using the browser clock.' }
  }

  const checkOut = (employeeId) => {
    const currentPreview = previewRef.current
    const openRecord = currentPreview.attendanceRecords.find(
      (record) =>
        record.employee_id === employeeId &&
        (record.check_out == null || record.check_out === ''),
    )
    if (!openRecord) {
      return { ok: false, message: 'There is no open attendance session to check out.' }
    }

    const now = new Date()
    const checkInAt = parseDateTime(openRecord.check_in)
    if (!checkInAt || now <= checkInAt) {
      return {
        ok: false,
        message: 'Check-out time must be later than the recorded check-in time.',
      }
    }

    const checkedOutAt = getLocalDateTime(now)
    const workingMinutes = Math.floor(
      (now.getTime() - checkInAt.getTime()) / 60000,
    )
    updatePreview((current) => ({
      ...current,
      attendanceRecords: current.attendanceRecords.map((record) =>
        record.attendance_id === openRecord.attendance_id
          ? {
              ...record,
              check_out: checkedOutAt,
              working_minutes: workingMinutes,
            }
          : record,
      ),
    }))
    return { ok: true, message: 'Check-out recorded using the browser clock.' }
  }

  const submitRequest = (requestData, employeeId, attendanceId) => {
    const currentPreview = previewRef.current
    const startTime = normalizeDateTime(requestData.start_time)
    const endTime = normalizeDateTime(requestData.end_time)
    const startAt = parseDateTime(startTime)
    const endAt = parseDateTime(endTime)
    if (!startAt || !endAt || endAt <= startAt) {
      return {
        ok: false,
        message: 'Enter valid request times, with the end later than the start.',
      }
    }

    if (
      requestData.request_type === 'ATTENDANCE_CORRECTION' &&
      !currentPreview.attendanceRecords.some(
        (record) =>
          record.attendance_id === Number(attendanceId) &&
          record.employee_id === employeeId,
      )
    ) {
      return { ok: false, message: 'Select an attendance record to correct.' }
    }

    const requestId =
      Math.max(0, ...currentPreview.requests.map((request) => request.request_id)) +
      1
    const request = {
      request_id: requestId,
      employee_id: employeeId,
      request_type: requestData.request_type,
      start_time: startTime,
      end_time: endTime,
      reason: requestData.reason,
      status: 'PENDING',
      reviewed_by: null,
      reviewed_at: null,
      created_at: getLocalDateTime(new Date()),
    }

    updatePreview((current) => ({
      ...current,
      requests: [...current.requests, request],
      correctionTargets:
        request.request_type === 'ATTENDANCE_CORRECTION'
          ? { ...current.correctionTargets, [requestId]: Number(attendanceId) }
          : current.correctionTargets,
    }))
    return { ok: true }
  }

  const reviewRequest = (requestId, status, managerId) => {
    const currentPreview = previewRef.current
    const request = currentPreview.requests.find(
      (record) => record.request_id === requestId,
    )
    if (!request || request.status !== 'PENDING') {
      return { ok: false, message: 'This request is no longer pending.' }
    }

    const reviewedAt = getLocalDateTime(new Date())
    let updatedAttendance = null
    let originalAttendance = null

    if (
      status === 'APPROVED' &&
      request.request_type === 'ATTENDANCE_CORRECTION'
    ) {
      const attendanceId = currentPreview.correctionTargets[requestId]
      originalAttendance = currentPreview.attendanceRecords.find(
        (record) => record.attendance_id === attendanceId,
      )
      if (!originalAttendance) {
        return {
          ok: false,
          message: 'The linked attendance record no longer exists; no correction was applied.',
        }
      }

      const checkIn = normalizeDateTime(request.start_time)
      const checkOut = normalizeDateTime(request.end_time)
      const checkInAt = parseDateTime(checkIn)
      const checkOutAt = parseDateTime(checkOut)
      if (!checkInAt || !checkOutAt || checkOutAt <= checkInAt) {
        return {
          ok: false,
          message: 'The requested correction times are invalid; no correction was applied.',
        }
      }

      updatedAttendance = {
        ...originalAttendance,
        check_in: checkIn,
        check_out: checkOut,
        working_minutes: Math.floor(
          (checkOutAt.getTime() - checkInAt.getTime()) / 60000,
        ),
      }
    }

    updatePreview((current) => ({
      ...current,
      requests: current.requests.map((record) =>
        record.request_id === requestId
          ? {
              ...record,
              status,
              reviewed_by: managerId ?? null,
              reviewed_at: reviewedAt,
            }
          : record,
      ),
      attendanceRecords: updatedAttendance
        ? current.attendanceRecords.map((record) =>
            record.attendance_id === updatedAttendance.attendance_id
              ? updatedAttendance
              : record,
          )
        : current.attendanceRecords,
      correctionAudit:
        updatedAttendance && originalAttendance
          ? [
              ...current.correctionAudit,
              {
                request_id: requestId,
                attendance_id: originalAttendance.attendance_id,
                original_values: { ...originalAttendance },
                updated_values: { ...updatedAttendance },
                reviewed_by: managerId ?? null,
                reason: request.reason,
                reviewed_at: reviewedAt,
              },
            ]
          : current.correctionAudit,
    }))
    return { ok: true }
  }

  const publishSchedule = (weekStart, shifts) => {
    updatePreview((current) => ({
      ...current,
      publishedShiftsByWeek: {
        ...current.publishedShiftsByWeek,
        [weekStart]: shifts.map((shift) => ({ ...shift })),
      },
    }))
  }

  return (
    <AttendancePreviewContext.Provider
      value={{
        ...preview,
        checkIn,
        checkOut,
        submitRequest,
        reviewRequest,
        publishSchedule,
      }}
    >
      {children}
    </AttendancePreviewContext.Provider>
  )
}

// This module intentionally exports the provider and its matching hook together.
// eslint-disable-next-line react-refresh/only-export-components
export const useAttendancePreview = () => {
  const context = useContext(AttendancePreviewContext)
  if (!context) {
    throw new Error(
      'useAttendancePreview must be used within AttendancePreviewProvider.',
    )
  }
  return context
}
