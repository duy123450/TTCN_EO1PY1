const DAY_MILLISECONDS = 24 * 60 * 60 * 1000
const HOUR_MILLISECONDS = 60 * 60 * 1000
const MINUTE_MILLISECONDS = 60 * 1000

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const LOCAL_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T]([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/

const isLeapYear = (year) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)

const daysInMonth = (year, month) => {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

const daysFromCivil = (year, month, day) => {
  const adjustedYear = year - (month <= 2 ? 1 : 0)
  const era = Math.floor(adjustedYear / 400)
  const yearOfEra = adjustedYear - era * 400
  const adjustedMonth = month + (month > 2 ? -3 : 9)
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear

  return era * 146097 + dayOfEra - 719468
}

const civilFromDays = (dayNumber) => {
  const shiftedDay = dayNumber + 719468
  const era = Math.floor(shiftedDay / 146097)
  const dayOfEra = shiftedDay - era * 146097
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  )
  let year = yearOfEra + era * 400
  const dayOfYear =
    dayOfEra -
    (365 * yearOfEra +
      Math.floor(yearOfEra / 4) -
      Math.floor(yearOfEra / 100))
  const monthPart = Math.floor((5 * dayOfYear + 2) / 153)
  const day =
    dayOfYear - Math.floor((153 * monthPart + 2) / 5) + 1
  const month = monthPart + (monthPart < 10 ? 3 : -9)
  year += month <= 2 ? 1 : 0

  return { year, month, day }
}

const formatDate = (dayNumber) => {
  const { year, month, day } = civilFromDays(dayNumber)
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const parseDate = (value) => {
  if (typeof value !== 'string') return null
  const match = value.match(DATE_PATTERN)
  if (!match) return null

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return null
  }

  return daysFromCivil(year, month, day)
}

const parseLocalTimestamp = (value) => {
  if (typeof value !== 'string') return null
  const match = value.match(LOCAL_TIMESTAMP_PATTERN)
  if (!match) return null

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    millisecondText,
  ] = match
  const dayNumber = parseDate(`${yearText}-${monthText}-${dayText}`)
  if (dayNumber == null) return null

  const milliseconds = millisecondText
    ? Number(millisecondText.padEnd(3, '0'))
    : 0

  return (
    dayNumber * DAY_MILLISECONDS +
    Number(hourText) * HOUR_MILLISECONDS +
    Number(minuteText) * MINUTE_MILLISECONDS +
    Number(secondText ?? 0) * 1000 +
    milliseconds
  )
}

const createWarning = (code, message, details = {}) => ({
  code,
  message,
  ...details,
})

const readRecords = (value, name, warnings, optional = false) => {
  if (Array.isArray(value)) return { records: value, available: true }
  if (optional && value == null) return { records: [], available: true }

  warnings.push(
    createWarning(
      value == null ? 'SOURCE_MISSING' : 'SOURCE_INVALID',
      `${name} must be provided as an array; related payroll amounts are unavailable.`,
      { source: name },
    ),
  )
  return { records: [], available: false }
}

const buildPayrollPeriod = (payrollMonth, config) => {
  if (
    typeof payrollMonth !== 'string' ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(payrollMonth)
  ) {
    throw new TypeError('payrollMonth must use the YYYY-MM format.')
  }

  const [year, month] = payrollMonth.split('-').map(Number)
  const periodStartDay = parseDate(`${payrollMonth}-01`)
  const nextMonthYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const periodEndExclusiveDay = daysFromCivil(nextMonthYear, nextMonth, 1)
  const paydayDay = config?.payday?.dayOfMonth
  const paydayMonthYear = nextMonthYear
  const paydayMonth = String(nextMonth).padStart(2, '0')
  const paydayDate =
    Number.isInteger(paydayDay) && paydayDay >= 1 && paydayDay <= 31
      ? `${String(paydayMonthYear).padStart(4, '0')}-${paydayMonth}-${String(paydayDay).padStart(2, '0')}`
      : null

  return {
    startDate: formatDate(periodStartDay),
    endDate: formatDate(periodEndExclusiveDay - 1),
    startDay: periodStartDay,
    endExclusiveDay: periodEndExclusiveDay,
    startMilliseconds: periodStartDay * DAY_MILLISECONDS,
    endExclusiveMilliseconds: periodEndExclusiveDay * DAY_MILLISECONDS,
    payday: paydayDate != null && parseDate(paydayDate) != null ? paydayDate : null,
  }
}

export const getPayrollPeriod = (payrollMonth, config) => {
  const period = buildPayrollPeriod(payrollMonth, config)
  return {
    startDate: period.startDate,
    endDate: period.endDate,
    payday: period.payday,
  }
}

const isFiniteNonNegative = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const isFinitePositive = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const validateRateRecords = (records, warnings) => {
  let complete = true
  const validRecords = []

  records.forEach((record, index) => {
    const hasEmployeeId = record?.employee_id != null
    const hasEmployeeType =
      typeof record?.employee_type === 'string' && record.employee_type !== ''
    const fromDay = parseDate(record?.effective_from)
    // Effective date endpoints are treated as inclusive calendar dates.
    const toDay =
      record?.effective_to == null ? null : parseDate(record.effective_to)
    const hasEndField = Object.hasOwn(record ?? {}, 'effective_to')
    const valid =
      hasEmployeeId !== hasEmployeeType &&
      isFinitePositive(record?.hourly_rate) &&
      fromDay != null &&
      hasEndField &&
      (record.effective_to == null || toDay != null) &&
      (toDay == null || toDay >= fromDay)

    if (!valid) {
      complete = false
      warnings.push(
        createWarning(
          'INVALID_HOURLY_RATE_RECORD',
          'An effective-dated hourly-rate record is missing a valid selector, rate, or date range.',
          { recordIndex: index },
        ),
      )
      return
    }

    validRecords.push({ ...record, fromDay, toDay, recordIndex: index })
  })

  return { records: validRecords, complete }
}

const matchesRateRecord = (record, employee) => {
  if (record.employee_id != null) {
    return record.employee_id === employee.employee_id
  }
  return record.employee_type === employee.employee_type
}

const getMatchingRateRecords = (records, employee, dayNumber) =>
  records.filter(
    (record) =>
      matchesRateRecord(record, employee) &&
      record.fromDay <= dayNumber &&
      (record.toDay == null || dayNumber <= record.toDay),
  )

const selectSingleRate = (records, warnings, employeeId, dayNumber) => {
  if (records.length === 0) return { rate: null, complete: true }
  const rates = [...new Set(records.map((record) => record.hourly_rate))]

  if (rates.length > 1) {
    warnings.push(
      createWarning(
        'CONFLICTING_HOURLY_RATES',
        `Overlapping effective hourly rates conflict for ${formatDate(dayNumber)}.`,
        { employeeId, date: formatDate(dayNumber) },
      ),
    )
    return { rate: null, complete: false }
  }

  if (records.length > 1) {
    warnings.push(
      createWarning(
        'DUPLICATE_HOURLY_RATE_RECORDS',
        `Multiple effective hourly-rate records apply on ${formatDate(dayNumber)}; their shared rate was used.`,
        { employeeId, date: formatDate(dayNumber) },
      ),
    )
  }

  return { rate: rates[0], complete: true }
}

const selectOfficialRate = (
  employee,
  dayNumber,
  rateRecords,
  config,
  warnings,
) => {
  const matchingRecords = getMatchingRateRecords(
    rateRecords,
    employee,
    dayNumber,
  )
  const employeeRecords = matchingRecords.filter(
    (record) => record.employee_id != null,
  )
  const activeRecords =
    employeeRecords.length > 0
      ? employeeRecords
      : matchingRecords.filter((record) => record.employee_type != null)
  if (activeRecords.length > 0) {
    return selectSingleRate(
      activeRecords,
      warnings,
      employee.employee_id,
      dayNumber,
    )
  }

  const fallbackRate = config?.hourlyRates?.[employee.employee_type]
  if (!isFinitePositive(fallbackRate)) {
    warnings.push(
      createWarning(
        'OFFICIAL_RATE_UNAVAILABLE',
        `No official hourly rate is available for employee type ${employee.employee_type ?? 'unknown'}.`,
        { employeeId: employee.employee_id, date: formatDate(dayNumber) },
      ),
    )
    return { rate: null, complete: false }
  }

  return { rate: fallbackRate, complete: true }
}

const selectHourlyRate = (
  employee,
  dayNumber,
  rateRecords,
  config,
  warnings,
) => {
  const startDay = parseDate(employee?.start_date)
  const duration = config?.hourlyRates?.probationDurationCalendarDays
  const probationRate = config?.hourlyRates?.probation

  if (startDay == null || !Number.isInteger(duration) || duration < 0) {
    warnings.push(
      createWarning(
        'PROBATION_BOUNDARY_UNAVAILABLE',
        'A valid employee start date and probation duration are required to select the applicable hourly rate.',
        { employeeId: employee?.employee_id, date: formatDate(dayNumber) },
      ),
    )
    return { rate: null, rateType: null, complete: false }
  }

  if (dayNumber < startDay) {
    warnings.push(
      createWarning(
        'WORK_BEFORE_EMPLOYMENT_START',
        `Attendance before the employee start date cannot be assigned a rate.`,
        { employeeId: employee.employee_id, date: formatDate(dayNumber) },
      ),
    )
    return { rate: null, rateType: null, complete: false }
  }

  if (dayNumber < startDay + duration) {
    if (!isFinitePositive(probationRate)) {
      warnings.push(
        createWarning(
          'PROBATION_RATE_UNAVAILABLE',
          'The configured probation hourly rate is invalid or missing.',
          { employeeId: employee.employee_id, date: formatDate(dayNumber) },
        ),
      )
      return { rate: null, rateType: null, complete: false }
    }

    const activeRecords = getMatchingRateRecords(
      rateRecords,
      employee,
      dayNumber,
    )
    if (activeRecords.some((record) => record.hourly_rate !== probationRate)) {
      warnings.push(
        createWarning(
          'PROBATION_RATE_CONFLICT',
          `An effective rate conflicts with the confirmed probation rate on ${formatDate(dayNumber)}.`,
          { employeeId: employee.employee_id, date: formatDate(dayNumber) },
        ),
      )
      return { rate: null, rateType: 'probation', complete: false }
    }

    return { rate: probationRate, rateType: 'probation', complete: true }
  }

  const result = selectOfficialRate(
    employee,
    dayNumber,
    rateRecords,
    config,
    warnings,
  )
  return { ...result, rateType: 'official' }
}

const buildHolidayIndex = (calendar, config, period, warnings) => {
  const holidaysByDate = new Map()
  const conflicts = new Set()
  let complete = true

  if (!calendar || !Array.isArray(calendar.holidays)) {
    warnings.push(
      createWarning(
        'HOLIDAY_CALENDAR_MISSING',
        'A holiday calendar with verified date entries is required.',
      ),
    )
    return { holidaysByDate, conflicts, complete: false }
  }

  const unresolvedRules = Array.isArray(calendar.unresolvedLunarRules)
    ? calendar.unresolvedLunarRules
    : []
  const lunarOnlyIncompleteReason =
    unresolvedRules.length > 0 &&
    typeof calendar.incomplete_reason === 'string' &&
    calendar.incomplete_reason.trim().toLowerCase() ===
      'gregorian dates for the lunar holidays have not been verified.'
  if (calendar.is_complete !== true && !lunarOnlyIncompleteReason) {
    complete = false
    warnings.push(
      createWarning(
        'HOLIDAY_CALENDAR_INCOMPLETE',
        calendar.incomplete_reason ||
          'The holiday calendar is incomplete; unresolved holidays may be excluded.',
      ),
    )
  }

  const periodYear = Number(period.startDate.slice(0, 4))
  if (calendar.year != null && calendar.year !== periodYear) {
    complete = false
    warnings.push(
      createWarning(
        'HOLIDAY_CALENDAR_YEAR_MISMATCH',
        `The holiday calendar is for ${calendar.year}, not payroll year ${periodYear}.`,
      ),
    )
  }

  calendar.holidays.forEach((holiday, index) => {
    const dayNumber = parseDate(holiday?.date)
    const category = holiday?.holiday_category
    const configuredMultiplier =
      category === 'TET'
        ? config?.holidayMultipliers?.tet
        : category === 'PUBLIC_HOLIDAY'
          ? config?.holidayMultipliers?.publicHoliday
          : null
    if (dayNumber != null && (dayNumber < period.startDay || dayNumber >= period.endExclusiveDay)) {
      return
    }

    const valid =
      dayNumber != null &&
      typeof holiday?.holiday_name === 'string' &&
      holiday.holiday_name.trim() !== '' &&
      isFinitePositive(configuredMultiplier) &&
      holiday.applicable_multiplier === configuredMultiplier

    if (!valid) {
      complete = false
      warnings.push(
        createWarning(
          'INVALID_HOLIDAY_RECORD',
          'A holiday entry has an invalid date, category, name, or multiplier and was not applied.',
          { recordIndex: index },
        ),
      )
      return
    }

    const normalized = {
      category,
      name: holiday.holiday_name,
      multiplier: configuredMultiplier,
    }
    const current = holidaysByDate.get(holiday.date)
    if (!current) {
      holidaysByDate.set(holiday.date, normalized)
    } else if (
      current.category !== normalized.category ||
      current.multiplier !== normalized.multiplier
    ) {
      conflicts.add(holiday.date)
      holidaysByDate.delete(holiday.date)
      complete = false
      warnings.push(
        createWarning(
          'CONFLICTING_HOLIDAY_RECORDS',
          `Conflicting holiday entries exist for ${holiday.date}; no multiplier was applied.`,
          { date: holiday.date },
        ),
      )
    } else {
      warnings.push(
        createWarning(
          'DUPLICATE_HOLIDAY_RECORD',
          `Duplicate holiday entries exist for ${holiday.date}; the date was counted once.`,
          { date: holiday.date },
        ),
      )
    }
  })

  const payrollMonth = Number(period.startDate.slice(5, 7))
  const possiblyApplicableRules = unresolvedRules.filter((rule) => {
    const lunarRule = rule?.lunar_rule?.toLowerCase().replace(/\s+/g, ' ')
    const holidayName = rule?.holiday_name?.toLowerCase()
    if (
      lunarRule?.includes('lunar march 10') ||
      holidayName?.includes("hung kings' commemoration")
    ) {
      return [3, 4, 5].includes(payrollMonth)
    }
    if (
      lunarRule?.includes('lunar december 29 through lunar january 3') ||
      holidayName?.includes('tet')
    ) {
      return [1, 2].includes(payrollMonth)
    }
    return true
  })

  if (possiblyApplicableRules.length > 0) {
    complete = false
    warnings.push(
      createWarning(
        'UNRESOLVED_LUNAR_HOLIDAYS',
        `One or more unresolved lunar holidays could fall in payroll month ${period.startDate.slice(0, 7)}; no Gregorian date was inferred.`,
        {
          payrollMonth: period.startDate.slice(0, 7),
          holidayNames: possiblyApplicableRules.map(
            (rule) => rule.holiday_name ?? 'Unspecified lunar holiday',
          ),
        },
      ),
    )
  }

  return { holidaysByDate, conflicts, complete }
}

const mergeIntervals = (intervals) => {
  const sorted = intervals
    .map((interval) => ({ start: interval.start, end: interval.end }))
    .sort((left, right) => left.start - right.start || left.end - right.end)
  const merged = []
  let overlapCount = 0

  for (const interval of sorted) {
    const previous = merged.at(-1)
    if (!previous || interval.start > previous.end) {
      merged.push(interval)
      continue
    }

    if (interval.start < previous.end) overlapCount += 1
    previous.end = Math.max(previous.end, interval.end)
  }

  return { intervals: merged, overlapCount }
}

const intervalDuration = (intervals) =>
  intervals.reduce((total, interval) => total + interval.end - interval.start, 0)

const clipInterval = (start, end, period) => {
  const clippedStart = Math.max(start, period.startMilliseconds)
  const clippedEnd = Math.min(end, period.endExclusiveMilliseconds)
  return clippedEnd > clippedStart
    ? { start: clippedStart, end: clippedEnd }
    : null
}

const collectAttendanceIntervals = (
  records,
  employee,
  employment,
  period,
  warnings,
) => {
  const intervals = []
  let complete = true
  const employmentStart = parseDate(employee.start_date) * DAY_MILLISECONDS
  const employmentEnd =
    employment.employment_end_date == null
      ? Number.POSITIVE_INFINITY
      : (parseDate(employment.employment_end_date) + 1) * DAY_MILLISECONDS

  records.forEach((record, index) => {
    if (record?.employee_id !== employee.employee_id) return

    const start = parseLocalTimestamp(record.check_in)
    if (start == null) {
      complete = false
      warnings.push(
        createWarning(
          'INVALID_ATTENDANCE_CHECK_IN',
          'An attendance record has no valid local check-in timestamp.',
          { employeeId: employee.employee_id, recordIndex: index },
        ),
      )
      return
    }

    if (start >= period.endExclusiveMilliseconds) return

    if (record.check_out == null || record.check_out === '') {
      complete = false
      warnings.push(
        createWarning(
          'ATTENDANCE_MISSING_CHECK_OUT',
          'An open attendance record was excluded; no checkout time or duration was inferred.',
          { employeeId: employee.employee_id, recordId: record.attendance_id },
        ),
      )
      return
    }

    const end = parseLocalTimestamp(record.check_out)
    if (end == null || end <= start) {
      complete = false
      warnings.push(
        createWarning(
          'INVALID_ATTENDANCE_INTERVAL',
          'An attendance interval has an invalid or non-positive duration and was excluded.',
          { employeeId: employee.employee_id, recordId: record.attendance_id },
        ),
      )
      return
    }

    if (
      typeof record.working_minutes === 'number' &&
      Number.isFinite(record.working_minutes) &&
      record.working_minutes >= 0 &&
      record.working_minutes !==
        Math.floor((end - start) / MINUTE_MILLISECONDS)
    ) {
      warnings.push(
        createWarning(
          'ATTENDANCE_MINUTES_MISMATCH',
          'Recorded working_minutes differs from the timestamp duration; timestamps were used.',
          { employeeId: employee.employee_id, recordId: record.attendance_id },
        ),
      )
    } else if (
      record.working_minutes != null &&
      (typeof record.working_minutes !== 'number' ||
        !Number.isFinite(record.working_minutes) ||
        record.working_minutes < 0)
    ) {
      warnings.push(
        createWarning(
          'ATTENDANCE_MINUTES_INVALID',
          'Invalid working_minutes was ignored; timestamps were used.',
          { employeeId: employee.employee_id, recordId: record.attendance_id },
        ),
      )
    }

    const clippedToPeriod = clipInterval(start, end, period)
    if (!clippedToPeriod) return
    const clipped = {
      start: Math.max(clippedToPeriod.start, employmentStart),
      end: Math.min(clippedToPeriod.end, employmentEnd),
    }
    if (clipped.end < clippedToPeriod.end || clipped.start > clippedToPeriod.start) {
      warnings.push(
        createWarning(
          'ATTENDANCE_OUTSIDE_EMPLOYMENT_PERIOD',
          'Attendance outside the employee employment dates was excluded.',
          { employeeId: employee.employee_id, recordId: record.attendance_id },
        ),
      )
    }
    if (clipped.end > clipped.start) intervals.push(clipped)
  })

  const merged = mergeIntervals(intervals)
  if (merged.overlapCount > 0) {
    warnings.push(
      createWarning(
        'OVERLAPPING_ATTENDANCE_INTERVALS',
        'Overlapping attendance intervals were merged so each instant is counted once.',
        { employeeId: employee.employee_id, overlapCount: merged.overlapCount },
      ),
    )
  }

  return { intervals: merged.intervals, complete }
}

const subtractIntervals = (intervals, excludedIntervals) => {
  const remaining = []

  for (const interval of intervals) {
    let cursor = interval.start
    for (const excluded of excludedIntervals) {
      if (excluded.end <= cursor) continue
      if (excluded.start >= interval.end) break
      if (excluded.start > cursor) {
        remaining.push({
          start: cursor,
          end: Math.min(excluded.start, interval.end),
        })
      }
      cursor = Math.max(cursor, excluded.end)
      if (cursor >= interval.end) break
    }
    if (cursor < interval.end) {
      remaining.push({ start: cursor, end: interval.end })
    }
  }

  return remaining
}

const collectApprovedOvertimeIntervals = (
  records,
  requests,
  employee,
  employment,
  period,
  warnings,
) => {
  const intervals = []
  const requestIds = new Set()
  let complete = true
  const employmentStart = parseDate(employee.start_date) * DAY_MILLISECONDS
  const employmentEnd =
    employment.employment_end_date == null
      ? Number.POSITIVE_INFINITY
      : (parseDate(employment.employment_end_date) + 1) * DAY_MILLISECONDS

  records.forEach((record, index) => {
    if (record?.employee_id !== employee.employee_id) return

    if (record.approval_status !== 'APPROVED') {
      warnings.push(
        createWarning(
          'OVERTIME_NOT_APPROVED',
          'Overtime without APPROVED status was excluded.',
          { employeeId: employee.employee_id, recordId: record.request_id, recordIndex: index },
        ),
      )
      return
    }

    const approvedAt = parseLocalTimestamp(record.approved_at)
    if (record.approved_by == null || approvedAt == null) {
      complete = false
      warnings.push(
        createWarning(
          'OVERTIME_APPROVAL_INCOMPLETE',
          'Approved overtime requires an approving manager and a valid approval timestamp.',
          { employeeId: employee.employee_id, recordId: record.request_id, recordIndex: index },
        ),
      )
      return
    }

    if (record.request_id != null && requests.length > 0) {
      const request = requests.find(
        (candidate) => candidate?.request_id === record.request_id,
      )
      if (
        request &&
        (request.employee_id !== employee.employee_id ||
          request.request_type !== 'OVERTIME')
      ) {
        complete = false
        warnings.push(
          createWarning(
            'OVERTIME_REQUEST_LINK_INVALID',
            'The overtime record links to a request for another employee or request type.',
            { employeeId: employee.employee_id, recordId: record.request_id },
          ),
        )
        return
      }
    }

    const start = parseLocalTimestamp(record.actual_start_time)
    const end = parseLocalTimestamp(record.actual_end_time)
    const actualMinutes =
      typeof record.actual_minutes === 'number' &&
      Number.isFinite(record.actual_minutes) &&
      record.actual_minutes > 0
        ? record.actual_minutes
        : null
    if (
      record.actual_minutes != null &&
      actualMinutes == null &&
      (start != null || end != null)
    ) {
      warnings.push(
        createWarning(
          'OVERTIME_ACTUAL_MINUTES_INVALID',
          'Invalid actual_minutes was ignored; valid timestamps remain authoritative.',
          { employeeId: employee.employee_id, recordId: record.request_id },
        ),
      )
    }

    if (start == null) {
      complete = false
      warnings.push(
        createWarning(
          'OVERTIME_ACTUAL_START_MISSING',
          'Confirmed overtime requires an actual start timestamp so it can be assigned to a date, rate, and holiday.',
          { employeeId: employee.employee_id, recordId: record.request_id, recordIndex: index },
        ),
      )
      return
    }

    let actualEnd = end
    if (actualEnd == null && actualMinutes != null) {
      if (record.actual_end_time != null && record.actual_end_time !== '') {
        warnings.push(
          createWarning(
            'OVERTIME_END_TIMESTAMP_INVALID',
            'An invalid overtime end timestamp was replaced by the manager-confirmed actual duration.',
            { employeeId: employee.employee_id, recordId: record.request_id },
          ),
        )
      }
      actualEnd = start + actualMinutes * MINUTE_MILLISECONDS
    } else if (
      actualEnd != null &&
      actualEnd <= start &&
      actualMinutes != null
    ) {
      warnings.push(
        createWarning(
          'OVERTIME_END_TIMESTAMP_INVALID',
          'A non-positive overtime interval was replaced by the manager-confirmed actual duration.',
          { employeeId: employee.employee_id, recordId: record.request_id },
        ),
      )
      actualEnd = start + actualMinutes * MINUTE_MILLISECONDS
    } else if (
      actualEnd != null &&
      actualEnd > start &&
      actualMinutes != null &&
      Math.abs(
        (actualEnd - start) / MINUTE_MILLISECONDS - actualMinutes,
      ) > 1e-9
    ) {
      warnings.push(
        createWarning(
          'OVERTIME_DURATION_MISMATCH',
          'Actual overtime timestamps differ from actual_minutes; timestamps were used.',
          { employeeId: employee.employee_id, recordId: record.request_id },
        ),
      )
    }

    if (actualEnd == null || actualEnd <= start) {
      complete = false
      warnings.push(
        createWarning(
          'OVERTIME_ACTUAL_DURATION_INVALID',
          'Approved overtime has no valid actual end timestamp or confirmed positive duration.',
          { employeeId: employee.employee_id, recordId: record.request_id, recordIndex: index },
        ),
      )
      return
    }

    const clippedToPeriod = clipInterval(start, actualEnd, period)
    if (!clippedToPeriod) return
    const clipped = {
      start: Math.max(clippedToPeriod.start, employmentStart),
      end: Math.min(clippedToPeriod.end, employmentEnd),
    }
    if (clipped.end < clippedToPeriod.end || clipped.start > clippedToPeriod.start) {
      warnings.push(
        createWarning(
          'OVERTIME_OUTSIDE_EMPLOYMENT_PERIOD',
          'Approved overtime outside the employee employment dates was excluded.',
          { employeeId: employee.employee_id, recordId: record.request_id },
        ),
      )
    }
    if (clipped.end <= clipped.start) return
    intervals.push(clipped)
    if (record.request_id != null) requestIds.add(record.request_id)
  })

  if (requests.length > 0) {
    requests.forEach((request) => {
      if (
        request?.employee_id !== employee.employee_id ||
        request.request_type !== 'OVERTIME'
      ) {
        return
      }

      const requestStart = parseLocalTimestamp(request.start_time)
      const requestEnd = parseLocalTimestamp(request.end_time)
      if (
        requestStart == null ||
        requestEnd == null ||
        requestEnd <= requestStart
      ) {
        warnings.push(
          createWarning(
            'OVERTIME_REQUEST_INVALID',
            'An overtime request has invalid requested timestamps; it was not treated as actual work.',
            { employeeId: employee.employee_id, recordId: request.request_id },
          ),
        )
        if (
          request.status === 'APPROVED' &&
          !requestIds.has(request.request_id)
        ) {
          warnings.push(
            createWarning(
              'OVERTIME_REQUEST_WITHOUT_ACTUAL_RECORD',
              'An approved overtime request has no linked manager-confirmed actual overtime record.',
              { employeeId: employee.employee_id, recordId: request.request_id },
            ),
          )
        }
        return
      }

      if (
        requestEnd <= period.startMilliseconds ||
        requestStart >= period.endExclusiveMilliseconds
      ) {
        return
      }

      if (request.status !== 'APPROVED') {
        warnings.push(
          createWarning(
            'OVERTIME_REQUEST_NOT_APPROVED',
            'A submitted overtime request is not proof of actual overtime and was excluded.',
            { employeeId: employee.employee_id, recordId: request.request_id },
          ),
        )
      } else if (!requestIds.has(request.request_id)) {
        warnings.push(
          createWarning(
            'OVERTIME_REQUEST_WITHOUT_ACTUAL_RECORD',
            'An approved overtime request has no linked manager-confirmed actual overtime record.',
            { employeeId: employee.employee_id, recordId: request.request_id },
          ),
        )
      }
    })
  }

  const merged = mergeIntervals(intervals)
  if (merged.overlapCount > 0) {
    warnings.push(
      createWarning(
        'OVERLAPPING_OVERTIME_INTERVALS',
        'Overlapping approved overtime records were merged so each instant is counted once.',
        { employeeId: employee.employee_id, overlapCount: merged.overlapCount },
      ),
    )
  }

  return { intervals: merged.intervals, complete }
}

const buildPriceSummary = () => ({
  basePay: 0,
  totalPay: 0,
  premiumPay: 0,
  seconds: 0,
  complete: true,
  probationBasePay: 0,
  officialBasePay: 0,
  holidayPay: new Map(),
})

const priceIntervals = (
  intervals,
  employee,
  rateRecords,
  rateRecordsAvailable,
  holidayIndex,
  config,
  source,
  warnings,
) => {
  const summary = buildPriceSummary()

  for (const interval of intervals) {
    let cursor = interval.start
    while (cursor < interval.end) {
      const dayNumber = Math.floor(cursor / DAY_MILLISECONDS)
      const segmentEnd = Math.min(
        interval.end,
        (dayNumber + 1) * DAY_MILLISECONDS,
      )
      const date = formatDate(dayNumber)
      if (!rateRecordsAvailable) summary.complete = false

      if (holidayIndex.conflicts.has(date)) {
        summary.complete = false
        warnings.push(
          createWarning(
            'HOLIDAY_MULTIPLIER_UNAVAILABLE',
            `No holiday multiplier was applied on ${date} because the calendar entries conflict.`,
            { employeeId: employee.employee_id, date },
          ),
        )
        cursor = segmentEnd
        continue
      }

      const rateResult = selectHourlyRate(
        employee,
        dayNumber,
        rateRecords,
        config,
        warnings,
      )
      if (!rateResult.complete || !isFinitePositive(rateResult.rate)) {
        summary.complete = false
        cursor = segmentEnd
        continue
      }

      const holiday = holidayIndex.holidaysByDate.get(date)
      const multiplier = holiday?.multiplier ?? 1
      const seconds = (segmentEnd - cursor) / 1000
      const basePay = (seconds / 3600) * rateResult.rate
      const premiumPay = basePay * (multiplier - 1)
      const totalPay = basePay + premiumPay
      summary.seconds += seconds
      summary.basePay += basePay
      summary.premiumPay += premiumPay
      summary.totalPay += totalPay

      if (rateResult.rateType === 'probation') {
        summary.probationBasePay += basePay
      } else {
        summary.officialBasePay += basePay
      }

      if (holiday) {
        const bucket = summary.holidayPay.get(holiday.category) ?? {
          category: holiday.category,
          multiplier,
          attendanceSeconds: 0,
          attendanceBasePay: 0,
          attendancePremiumPay: 0,
          overtimeSeconds: 0,
          overtimeBasePay: 0,
          overtimePremiumPay: 0,
        }
        if (source === 'attendance') {
          bucket.attendanceSeconds += seconds
          bucket.attendanceBasePay += basePay
          bucket.attendancePremiumPay += premiumPay
        } else {
          bucket.overtimeSeconds += seconds
          bucket.overtimeBasePay += basePay
          bucket.overtimePremiumPay += premiumPay
        }
        summary.holidayPay.set(holiday.category, bucket)
      }

      cursor = segmentEnd
    }
  }

  return summary
}

const formatHolidayBreakdown = (attendanceSummary, overtimeSummary) => {
  const categories = new Map()

  for (const summary of [attendanceSummary, overtimeSummary]) {
    for (const [category, bucket] of summary.holidayPay) {
      const current = categories.get(category) ?? {
        category,
        multiplier: bucket.multiplier,
        attendanceMinutes: 0,
        attendanceBasePay: 0,
        attendancePremiumPay: 0,
        additionalOvertimeMinutes: 0,
        additionalOvertimeBasePay: 0,
        additionalOvertimePremiumPay: 0,
        totalPay: 0,
      }
      current.attendanceMinutes += bucket.attendanceSeconds / 60
      current.attendanceBasePay += bucket.attendanceBasePay
      current.attendancePremiumPay += bucket.attendancePremiumPay
      current.additionalOvertimeMinutes += bucket.overtimeSeconds / 60
      current.additionalOvertimeBasePay += bucket.overtimeBasePay
      current.additionalOvertimePremiumPay += bucket.overtimePremiumPay
      current.totalPay +=
        bucket.attendanceBasePay +
        bucket.attendancePremiumPay +
        bucket.overtimeBasePay +
        bucket.overtimePremiumPay
      categories.set(category, current)
    }
  }

  return [...categories.values()].sort((left, right) =>
    left.category.localeCompare(right.category),
  )
}

const validateEmploymentRoster = (
  employees,
  employmentRecords,
  employeesAvailable,
  employmentRecordsAvailable,
  period,
  warnings,
) => {
  const unresolvedEmployees = []
  const eligibleEmployees = []
  const seenIds = new Set()
  let complete = employeesAvailable && employmentRecordsAvailable
  const employmentById = new Map()

  employmentRecords.forEach((record, index) => {
    if (record?.employee_id == null || employmentById.has(record.employee_id)) {
      complete = false
      warnings.push(
        createWarning(
          'INVALID_EMPLOYMENT_RECORD',
          'Employment records require a unique employee_id.',
          { recordIndex: index },
        ),
      )
      return
    }
    employmentById.set(record.employee_id, record)
  })

  employees.forEach((employee, index) => {
    const employeeId = employee?.employee_id
    if (employeeId == null || seenIds.has(employeeId)) {
      complete = false
      unresolvedEmployees.push({
        employeeId: employeeId ?? null,
        reason: 'Employee records require unique employee_id values.',
      })
      warnings.push(
        createWarning(
          'INVALID_EMPLOYEE_RECORD',
          'Employee records require unique employee_id values.',
          { recordIndex: index },
        ),
      )
      return
    }
    seenIds.add(employeeId)

    const startDay = parseDate(employee.start_date)
    const employment = employmentById.get(employeeId)
    const endDay =
      employment?.employment_end_date == null
        ? null
        : parseDate(employment.employment_end_date)

    if (startDay == null || !employment || (employment.employment_end_date != null && endDay == null)) {
      complete = false
      const reason = !employment
        ? 'No employment supplement exists for this employee.'
        : 'A valid employee start date and employment end date are required.'
      unresolvedEmployees.push({ employeeId, reason })
      warnings.push(
        createWarning('EMPLOYMENT_DATES_INCOMPLETE', reason, { employeeId }),
      )
      return
    }

    if (endDay != null && endDay < startDay) {
      complete = false
      const reason = 'Employment end date precedes the employee start date.'
      unresolvedEmployees.push({ employeeId, reason })
      warnings.push(
        createWarning('EMPLOYMENT_DATES_INVALID', reason, { employeeId }),
      )
      return
    }

    // Employment start/end dates are inclusive calendar dates.
    const employedInPeriod =
      startDay < period.endExclusiveDay &&
      (endDay == null || endDay >= period.startDay)
    if (employedInPeriod) eligibleEmployees.push({ employee, employment })
  })

  for (const [employeeId] of employmentById) {
    if (!seenIds.has(employeeId)) {
      complete = false
      unresolvedEmployees.push({
        employeeId,
        reason: 'An employment supplement references an employee absent from the employee list.',
      })
      warnings.push(
        createWarning(
          'EMPLOYMENT_RECORD_WITHOUT_EMPLOYEE',
          'An employment supplement references an employee absent from the employee list.',
          { employeeId },
        ),
      )
    }
  }

  return { eligibleEmployees, unresolvedEmployees, complete }
}

const getRevenueForMonth = (
  records,
  available,
  payrollMonth,
  warnings,
) => {
  if (!available) return { revenue: null, complete: false }
  const matching = records.filter(
    (record) => record?.payroll_month === payrollMonth,
  )
  if (matching.length === 0) {
    warnings.push(
      createWarning(
        'MONTHLY_REVENUE_MISSING',
        `No revenue record is available for ${payrollMonth}.`,
        { payrollMonth },
      ),
    )
    return { revenue: null, complete: false }
  }

  const normalized = matching.map((record, index) => ({
    record,
    index,
    updatedAt: parseLocalTimestamp(record.updated_at),
  }))
  if (
    normalized.some(
      ({ record, updatedAt }) =>
        !isFiniteNonNegative(record.total_revenue) || updatedAt == null,
    )
  ) {
    warnings.push(
      createWarning(
        'MONTHLY_REVENUE_INVALID',
        'A monthly revenue record has an invalid amount or update timestamp.',
        { payrollMonth },
      ),
    )
    return { revenue: null, complete: false }
  }

  normalized.sort(
    (left, right) =>
      left.updatedAt - right.updatedAt || left.index - right.index,
  )
  const latest = normalized.at(-1)
  const sameTimestamp = normalized.filter(
    (item) => item.updatedAt === latest.updatedAt,
  )
  const latestValues = new Set(
    sameTimestamp.map((item) => item.record.total_revenue),
  )
  if (latestValues.size > 1) {
    warnings.push(
      createWarning(
        'MONTHLY_REVENUE_CONFLICT',
        `The latest revenue records conflict for ${payrollMonth}.`,
        { payrollMonth },
      ),
    )
    return { revenue: null, complete: false }
  }

  if (matching.length > 1) {
    warnings.push(
      createWarning(
        'MULTIPLE_MONTHLY_REVENUE_RECORDS',
        `Multiple revenue records exist for ${payrollMonth}; the latest update was used.`,
        { payrollMonth },
      ),
    )
  }

  return { revenue: latest.record.total_revenue, complete: true }
}

const getKpiSummary = (
  revenueResult,
  roster,
  config,
  payrollMonth,
  warnings,
) => {
  const revenue = revenueResult.revenue
  const threshold = config?.kpiBonus?.minimumMonthlyRevenue
  const poolRate = config?.kpiBonus?.poolRate
  const validKpiConfig =
    isFiniteNonNegative(threshold) && isFiniteNonNegative(poolRate)

  if (!validKpiConfig) {
    warnings.push(
      createWarning(
        'KPI_CONFIGURATION_INVALID',
        'A valid KPI threshold and pool rate are required.',
      ),
    )
  }

  const thresholdReached =
    revenue != null && validKpiConfig ? revenue >= threshold : null
  const poolAmount =
    thresholdReached == null
      ? null
      : thresholdReached
        ? revenue * poolRate
        : 0
  const eligibleEmployeeCount = roster.complete
    ? roster.eligibleEmployees.length
    : null
  const perEmployeeShare =
    poolAmount == null
      ? null
      : poolAmount === 0
        ? 0
        : eligibleEmployeeCount == null || eligibleEmployeeCount === 0
          ? null
          : poolAmount / eligibleEmployeeCount

  return {
    payrollMonth,
    monthlyRevenue: revenue,
    revenueStatus: revenueResult.complete ? 'AVAILABLE' : 'UNAVAILABLE',
    thresholdReached,
    totalPool: poolAmount,
    eligibleEmployeeCount,
    knownEligibleEmployeeCount: roster.eligibleEmployees.length,
    perEmployeeShare,
    distributionStatus:
      poolAmount == null
        ? 'UNAVAILABLE'
        : poolAmount === 0
          ? 'NO_POOL'
          : eligibleEmployeeCount == null
            ? 'ROSTER_INCOMPLETE'
            : eligibleEmployeeCount === 0
              ? 'NO_ELIGIBLE_EMPLOYEES'
              : 'AVAILABLE',
  }
}

const getResponsibilityBonus = (
  employee,
  violations,
  violationsAvailable,
  period,
  config,
  warnings,
) => {
  if (!violationsAvailable) {
    return {
      eligible: null,
      amount: null,
      reason: 'Violation records are unavailable.',
      qualifyingViolations: [],
      complete: false,
    }
  }

  let complete = true
  const qualifyingViolations = []

  violations.forEach((record, index) => {
    if (record?.employee_id !== employee.employee_id) return
    const violationDay = parseDate(record.violation_date)
    const insidePeriod =
      violationDay != null &&
      violationDay >= period.startDay &&
      violationDay < period.endExclusiveDay

    if (record.qualifies_for_responsibility_disqualification === false) {
      if (violationDay == null) {
        warnings.push(
          createWarning(
            'VIOLATION_DATE_INVALID',
            'A non-qualifying violation has an invalid date; it did not affect bonus eligibility.',
            { employeeId: employee.employee_id, recordIndex: index },
          ),
        )
      }
      return
    }

    if (
      record.approval_status != null &&
      record.approval_status !== 'APPROVED'
    ) {
      if (insidePeriod || violationDay == null) {
        complete = false
        warnings.push(
          createWarning(
            'VIOLATION_NOT_APPROVED',
            'An unapproved violation cannot disqualify the responsibility bonus; eligibility remains incomplete.',
            { employeeId: employee.employee_id, recordIndex: index },
          ),
        )
      }
      return
    }

    if (record.qualifies_for_responsibility_disqualification !== true) {
      if (insidePeriod || violationDay == null) {
        complete = false
        warnings.push(
          createWarning(
            'VIOLATION_QUALIFICATION_MISSING',
            'A violation without an explicit qualification flag cannot determine responsibility-bonus eligibility.',
            { employeeId: employee.employee_id, recordIndex: index },
          ),
        )
      }
      return
    }

    if (violationDay == null) {
      complete = false
      warnings.push(
        createWarning(
          'VIOLATION_DATE_INVALID',
          'A qualifying violation has an invalid date; responsibility-bonus eligibility is incomplete.',
          { employeeId: employee.employee_id, recordIndex: index },
        ),
      )
      return
    }
    if (!insidePeriod) return

    if (record.recorded_by == null) {
      complete = false
      warnings.push(
        createWarning(
          'VIOLATION_MANAGER_MISSING',
          'A qualifying violation has no manager recorder and cannot disqualify the bonus.',
          { employeeId: employee.employee_id, recordIndex: index },
        ),
      )
      return
    }
    if (typeof record.reason !== 'string' || record.reason.trim() === '') {
      complete = false
      warnings.push(
        createWarning(
          'VIOLATION_REASON_MISSING',
          'A qualifying violation has no reason; responsibility-bonus eligibility is incomplete.',
          { employeeId: employee.employee_id, recordIndex: index },
        ),
      )
      return
    }

    qualifyingViolations.push(record)
  })

  if (qualifyingViolations.length > 0) {
    return {
      eligible: false,
      amount: 0,
      reason: 'A qualifying manager-recorded violation occurred during the payroll month.',
      qualifyingViolations: qualifyingViolations.map((record) => ({
        violationDate: record.violation_date,
        reason: record.reason,
        recordedBy: record.recorded_by,
      })),
      complete: true,
    }
  }

  if (!complete) {
    return {
      eligible: null,
      amount: null,
      reason: 'One or more violation records are incomplete.',
      qualifyingViolations,
      complete: false,
    }
  }

  const amount =
    config?.responsibilityBonusByEmployeeType?.[employee.employee_type]
  if (!isFiniteNonNegative(amount)) {
    warnings.push(
      createWarning(
        'RESPONSIBILITY_BONUS_CONFIGURATION_INVALID',
        `No valid responsibility bonus is configured for ${employee.employee_type ?? 'unknown'} employees.`,
        { employeeId: employee.employee_id },
      ),
    )
    return {
      eligible: null,
      amount: null,
      reason: 'Responsibility-bonus configuration is unavailable.',
      qualifyingViolations: [],
      complete: false,
    }
  }

  return {
    eligible: true,
    amount,
    reason: 'No qualifying manager-recorded violation was found for the payroll month.',
    qualifyingViolations: [],
    complete: true,
  }
}

const getPenaltyDeductions = (
  records,
  available,
  employee,
  payrollMonth,
  warnings,
) => {
  if (!available) return { amount: null, items: [], complete: false }

  let amount = 0
  let complete = true
  const items = []

  records.forEach((record, index) => {
    if (record?.employee_id !== employee.employee_id) return
    if (record.payroll_month !== payrollMonth) {
      if (record.payroll_month == null) {
        warnings.push(
          createWarning(
            'PENALTY_PERIOD_MISSING',
            'A penalty without payroll_month was excluded.',
            { employeeId: employee.employee_id, recordIndex: index },
          ),
        )
      }
      return
    }

    if (record.approval_status !== 'APPROVED') {
      warnings.push(
        createWarning(
          'PENALTY_NOT_APPROVED',
          'A penalty without APPROVED status was excluded.',
          { employeeId: employee.employee_id, recordIndex: index },
        ),
      )
      return
    }

    if (record.is_uniform_deduction === true) {
      warnings.push(
        createWarning(
          'UNIFORM_DEDUCTION_PROHIBITED',
          'A uniform deduction was excluded by policy.',
          { employeeId: employee.employee_id, recordIndex: index },
        ),
      )
      return
    }

    const valid =
      record.is_uniform_deduction === false &&
      isFiniteNonNegative(record.amount) &&
      typeof record.reason === 'string' &&
      record.reason.trim() !== '' &&
      parseDate(record.violation_date) != null &&
      record.recorded_by != null &&
      record.approved_by != null &&
      parseLocalTimestamp(record.approved_at) != null

    if (!valid) {
      complete = false
      warnings.push(
        createWarning(
          'APPROVED_PENALTY_INCOMPLETE',
          'An approved penalty requires an explicit non-uniform flag, manager recorder and approver, valid amount, reason, violation date, and approval timestamp.',
          { employeeId: employee.employee_id, recordIndex: index },
        ),
      )
      return
    }

    const item = {
      amount: record.amount,
      reason: record.reason,
      violationDate: record.violation_date,
      recordedBy: record.recorded_by,
      approvedBy: record.approved_by,
      approvedAt: record.approved_at,
      payrollMonth: record.payroll_month,
    }
    amount += record.amount
    items.push(item)
  })

  return {
    amount: complete ? amount : null,
    knownAmount: amount,
    items,
    complete,
  }
}

const roundDown = (amount, unit) => Math.floor(amount / unit) * unit

/**
 * Calculate one monthly payroll using explicit, preloaded records.
 * Null monetary values signal incomplete required data; zero is a known zero.
 * Holiday breakdown subtotals are already included in attendance/overtime pay.
 */
export const calculateMonthlyPayroll = (input) => {
  if (!input || typeof input !== 'object') {
    throw new TypeError('Payroll calculation input must be an object.')
  }
  if (!input.config || typeof input.config !== 'object') {
    throw new TypeError('Payroll calculation requires a configuration object.')
  }

  const period = buildPayrollPeriod(input.payrollMonth, input.config)
  const globalWarnings = []
  globalWarnings.push(
    createWarning(
      'MANAGER_ROLE_NOT_VERIFIABLE',
      'Preview data can verify manager identifiers and approval timestamps, but cannot verify that approvers hold manager roles.',
    ),
  )
  if (period.payday == null) {
    globalWarnings.push(
      createWarning(
        'PAYDAY_CONFIGURATION_INVALID',
        'The configured payday must be a real calendar date in the month following payroll.',
      ),
    )
  }
  const employeesSource = readRecords(
    input.employees,
    'employees',
    globalWarnings,
  )
  const employmentSource = readRecords(
    input.employmentRecords,
    'employmentRecords',
    globalWarnings,
  )
  const attendanceSource = readRecords(
    input.attendanceRecords,
    'attendanceRecords',
    globalWarnings,
  )
  const rateSource = readRecords(
    input.hourlyRateRecords,
    'hourlyRateRecords',
    globalWarnings,
  )
  const revenueSource = readRecords(
    input.monthlyRevenueRecords,
    'monthlyRevenueRecords',
    globalWarnings,
  )
  const overtimeSource = readRecords(
    input.approvedOvertimeRecords,
    'approvedOvertimeRecords',
    globalWarnings,
  )
  const requestSource = readRecords(
    input.overtimeRequests,
    'overtimeRequests',
    globalWarnings,
    true,
  )
  const violationSource = readRecords(
    input.responsibilityViolations,
    'responsibilityViolations',
    globalWarnings,
  )
  const penaltySource = readRecords(
    input.penaltyRecords,
    'penaltyRecords',
    globalWarnings,
  )
  const rateValidation = validateRateRecords(
    rateSource.records,
    globalWarnings,
  )
  const holidayIndex = buildHolidayIndex(
    input.holidayCalendar,
    input.config,
    period,
    globalWarnings,
  )
  const roster = validateEmploymentRoster(
    employeesSource.records,
    employmentSource.records,
    employeesSource.available,
    employmentSource.available,
    period,
    globalWarnings,
  )
  const revenueResult = getRevenueForMonth(
    revenueSource.records,
    revenueSource.available,
    input.payrollMonth,
    globalWarnings,
  )
  const kpi = getKpiSummary(
    revenueResult,
    roster,
    input.config,
    input.payrollMonth,
    globalWarnings,
  )
  const roundingUnit = input.config.finalRounding?.unitVnd
  const roundingAvailable = isFinitePositive(roundingUnit)
  if (!roundingAvailable) {
    globalWarnings.push(
      createWarning(
        'FINAL_ROUNDING_CONFIGURATION_INVALID',
        'A positive final rounding unit is required.',
      ),
    )
  }

  const employeeResults = roster.eligibleEmployees.map(
    ({ employee, employment }) => {
      const warnings = [...globalWarnings]
      const attendance = collectAttendanceIntervals(
        attendanceSource.records,
        employee,
        employment,
        period,
        warnings,
      )
      const approvedOvertime = collectApprovedOvertimeIntervals(
        overtimeSource.records,
        requestSource.records,
        employee,
        employment,
        period,
        warnings,
      )
      const additionalOvertimeIntervals = subtractIntervals(
        approvedOvertime.intervals,
        attendance.intervals,
      )
      const attendanceOvertimeOverlap =
        intervalDuration(approvedOvertime.intervals) -
        intervalDuration(additionalOvertimeIntervals)
      if (attendanceOvertimeOverlap > 0) {
        warnings.push(
          createWarning(
            'OVERTIME_ALREADY_IN_ATTENDANCE',
            'Approved overtime overlapping attendance was not paid a second time.',
            {
              employeeId: employee.employee_id,
              overlapMinutes: attendanceOvertimeOverlap / MINUTE_MILLISECONDS,
            },
          ),
        )
      }

      const attendancePricing = priceIntervals(
        attendance.intervals,
        employee,
        rateValidation.records,
        rateSource.available && rateValidation.complete,
        holidayIndex,
        input.config,
        'attendance',
        warnings,
      )
      const overtimePricing = priceIntervals(
        additionalOvertimeIntervals,
        employee,
        rateValidation.records,
        rateSource.available && rateValidation.complete,
        holidayIndex,
        input.config,
        'overtime',
        warnings,
      )
      const responsibilityBonus = getResponsibilityBonus(
        employee,
        violationSource.records,
        violationSource.available,
        period,
        input.config,
        warnings,
      )
      const penaltyDeductions = getPenaltyDeductions(
        penaltySource.records,
        penaltySource.available,
        employee,
        input.payrollMonth,
        warnings,
      )
      const kpiShare = kpi.perEmployeeShare
      const attendanceComplete =
        attendanceSource.available &&
        attendance.complete &&
        attendancePricing.complete
      const overtimeComplete =
        overtimeSource.available &&
        requestSource.available &&
        approvedOvertime.complete &&
        overtimePricing.complete
      const actualMinutesComplete =
        attendanceSource.available &&
        attendance.complete &&
        overtimeSource.available &&
        requestSource.available &&
        approvedOvertime.complete
      const actualAttendancePay = attendanceComplete
        ? attendancePricing.totalPay
        : null
      const additionalOvertimePay = overtimeComplete
        ? overtimePricing.totalPay
        : null
      const grossAmountBeforeDeductions =
        actualAttendancePay != null &&
        additionalOvertimePay != null &&
        responsibilityBonus.amount != null &&
        kpiShare != null
          ? actualAttendancePay +
            additionalOvertimePay +
            responsibilityBonus.amount +
            kpiShare
          : null
      const amountBeforeFinalRounding =
        grossAmountBeforeDeductions != null &&
        penaltyDeductions.amount != null
          ? grossAmountBeforeDeductions - penaltyDeductions.amount
          : null
      const finalPayableAmount =
        amountBeforeFinalRounding != null && roundingAvailable
          ? roundDown(amountBeforeFinalRounding, roundingUnit)
          : null
      const totalActualPayableMilliseconds =
        attendanceComplete && overtimeComplete
          ? intervalDuration(attendance.intervals) +
            intervalDuration(additionalOvertimeIntervals)
          : null
      const holidayPayBreakdown = formatHolidayBreakdown(
        attendancePricing,
        overtimePricing,
      )
      const incompleteData =
        !attendanceComplete ||
        !overtimeComplete ||
        !actualMinutesComplete ||
        !responsibilityBonus.complete ||
        !penaltyDeductions.complete ||
        !revenueResult.complete ||
        kpiShare == null ||
        !roster.complete ||
        !holidayIndex.complete ||
        !roundingAvailable
      const isProvisional = incompleteData

      return {
        employeeId: employee.employee_id,
        payrollMonth: input.payrollMonth,
        employmentStartDate: employee.start_date,
        employmentEndDate: employment.employment_end_date ?? null,
        employmentStatus: 'EMPLOYED_DURING_PERIOD',
        minimumMonthlyReference:
          input.config.monthlyReferenceByEmployeeType?.[
            employee.employee_type
          ] ?? null,
        totalActualPayableMinutes:
          totalActualPayableMilliseconds == null
            ? null
            : totalActualPayableMilliseconds / MINUTE_MILLISECONDS,
        totalActualPayableHours:
          totalActualPayableMilliseconds == null
            ? null
            : totalActualPayableMilliseconds / HOUR_MILLISECONDS,
        attendanceMinutes:
          attendanceSource.available && attendance.complete
            ? intervalDuration(attendance.intervals) / MINUTE_MILLISECONDS
            : null,
        knownAttendanceMinutes:
          attendanceSource.available
            ? intervalDuration(attendance.intervals) / MINUTE_MILLISECONDS
            : null,
        approvedAdditionalOvertimeMinutes:
          overtimeSource.available && approvedOvertime.complete
            ? intervalDuration(additionalOvertimeIntervals) /
              MINUTE_MILLISECONDS
            : null,
        knownApprovedAdditionalOvertimeMinutes:
          overtimeSource.available
            ? intervalDuration(additionalOvertimeIntervals) /
              MINUTE_MILLISECONDS
            : null,
        regularWorkingPay:
          attendanceComplete ? attendancePricing.basePay : null,
        probationPay:
          attendanceComplete ? attendancePricing.probationBasePay : null,
        officialRatePay:
          attendanceComplete ? attendancePricing.officialBasePay : null,
        actualAttendancePay,
        holidayPayBreakdown,
        holidayPayBreakdownIsCrossCutting: true,
        holidayPayBreakdownNote:
          'Holiday totals are informational subtotals; hourlyAttendancePay and approvedAdditionalOvertimePay already include the applicable premiums.',
        hourlyAttendancePay: actualAttendancePay,
        approvedAdditionalOvertimePay: additionalOvertimePay,
        overtimePayBreakdown: {
          basePay: overtimeComplete ? overtimePricing.basePay : null,
          holidayPremiumPay: overtimeComplete
            ? overtimePricing.premiumPay
            : null,
        },
        responsibilityBonus,
        kpiBonus: {
          amount: kpiShare,
          distributionStatus: kpi.distributionStatus,
          poolAmount: kpi.totalPool,
          eligibleEmployeeCount: kpi.eligibleEmployeeCount,
        },
        approvedPenaltyDeductions: penaltyDeductions.items,
        grossAmountBeforeDeductions,
        totalApprovedDeductions: penaltyDeductions.amount,
        amountBeforeFinalRounding,
        finalPayableAmount,
        incompleteData,
        isProvisional,
        warnings,
      }
    },
  )

  return {
    payrollMonth: input.payrollMonth,
    period: {
      startDate: period.startDate,
      endDate: period.endDate,
      payday: period.payday,
    },
    kpi,
    employees: employeeResults,
    unresolvedEmployees: roster.unresolvedEmployees,
    incompleteData:
      !employeesSource.available ||
      !employmentSource.available ||
      !attendanceSource.available ||
      !rateSource.available ||
      !rateValidation.complete ||
      !revenueSource.available ||
      !overtimeSource.available ||
      !requestSource.available ||
      !violationSource.available ||
      !penaltySource.available ||
      !revenueResult.complete ||
      !roster.complete ||
      !holidayIndex.complete ||
      !roundingAvailable ||
      employeeResults.some((result) => result.incompleteData),
    warnings: [
      ...globalWarnings,
      ...employeeResults.flatMap((result) =>
        result.warnings.filter((warning) => !globalWarnings.includes(warning)),
      ),
    ],
  }
}

const completedCalendarMonths = (startDay, endDay) => {
  const start = civilFromDays(startDay)
  const end = civilFromDays(endDay)
  let months = (end.year - start.year) * 12 + end.month - start.month
  const anniversaryDay = Math.min(start.day, daysInMonth(end.year, end.month))
  if (end.day < anniversaryDay) months -= 1
  return months
}

/**
 * Calculate the separate December 31 seniority bonus.
 * The returned amount is rounded independently, outside monthly payroll.
 */
export const calculateThirteenthMonthBonus = ({
  employee,
  year,
  hourlyRateRecords,
  config,
}) => {
  if (!employee || typeof employee !== 'object') {
    throw new TypeError('A valid employee record is required.')
  }
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new TypeError('year must be an integer from 1 through 9999.')
  }
  if (!config || typeof config !== 'object') {
    throw new TypeError('13th-month calculation requires a configuration object.')
  }

  const warnings = []
  const referenceDate = `${String(year).padStart(4, '0')}-12-31`
  const referenceDay = parseDate(referenceDate)
  const startDay = parseDate(employee.start_date)
  const rateSource = readRecords(
    hourlyRateRecords,
    'hourlyRateRecords',
    warnings,
  )
  const rateValidation = validateRateRecords(
    rateSource.records,
    warnings,
  )
  const seniorityMonths =
    startDay == null
      ? null
      : startDay > referenceDay
        ? 0
        : completedCalendarMonths(startDay, referenceDay)
  const basisHours =
    config.thirteenthMonthBonus?.basisHoursByEmployeeType?.[
      employee.employee_type
    ]
  const roundingUnit =
    config.thirteenthMonthBonus?.separatePaymentRoundingUnitVnd
  const minimumMonths =
    config.thirteenthMonthBonus?.minimumSeniorityMonths
  const partialMinimum =
    config.thirteenthMonthBonus?.partialRateMinimumMonths
  const partialMaximum =
    config.thirteenthMonthBonus?.partialRateMaximumMonthsExclusive
  const fullMinimum =
    config.thirteenthMonthBonus?.fullRateMinimumMonths
  const partialRate = config.thirteenthMonthBonus?.partialRate
  const fullRate = config.thirteenthMonthBonus?.fullRate
  const configValid =
    isFiniteNonNegative(basisHours) &&
    isFinitePositive(roundingUnit) &&
    Number.isInteger(minimumMonths) &&
    Number.isInteger(partialMinimum) &&
    Number.isInteger(partialMaximum) &&
    Number.isInteger(fullMinimum) &&
    isFiniteNonNegative(partialRate) &&
    isFiniteNonNegative(fullRate)

  if (startDay == null) {
    warnings.push(
      createWarning(
        'EMPLOYEE_START_DATE_INVALID',
        'A valid employee start_date is required to evaluate 13th-month seniority.',
        { employeeId: employee.employee_id },
      ),
    )
  }
  if (!configValid) {
    warnings.push(
      createWarning(
        'THIRTEENTH_MONTH_CONFIGURATION_INVALID',
        '13th-month basis, seniority thresholds, rates, and rounding configuration must be valid.',
        { employeeId: employee.employee_id },
      ),
    )
  }

  const applicablePercentage =
    seniorityMonths == null || !configValid
      ? null
      : seniorityMonths < minimumMonths
        ? 0
        : seniorityMonths >= fullMinimum
          ? fullRate
          : seniorityMonths >= partialMinimum &&
              seniorityMonths < partialMaximum
            ? partialRate
            : null

  if (applicablePercentage == null && seniorityMonths != null && configValid) {
    warnings.push(
      createWarning(
        'THIRTEENTH_MONTH_TIER_UNAVAILABLE',
        'No 13th-month seniority tier matches the configured boundaries.',
        { employeeId: employee.employee_id, seniorityMonths },
      ),
    )
  }

  if (seniorityMonths != null && seniorityMonths < minimumMonths) {
    return {
      employeeId: employee.employee_id,
      year,
      seniorityEvaluationDate: referenceDate,
      hourlyRateReferenceDate: referenceDate,
      seniorityMonths,
      applicablePercentage: 0,
      officialHourlyRate: null,
      basisHours: configValid ? basisHours : null,
      amountBeforeRounding: 0,
      roundingUnitVnd: configValid ? roundingUnit : null,
      roundedAmount: 0,
      eligible: false,
      status: configValid ? 'INELIGIBLE' : 'INCOMPLETE',
      incompleteData: !configValid,
      warnings,
    }
  }

  if (
    seniorityMonths == null ||
    !configValid ||
    applicablePercentage == null ||
    !rateSource.available ||
    !rateValidation.complete
  ) {
    return {
      employeeId: employee.employee_id,
      year,
      seniorityEvaluationDate: referenceDate,
      hourlyRateReferenceDate: referenceDate,
      seniorityMonths,
      applicablePercentage,
      officialHourlyRate: null,
      basisHours: configValid ? basisHours : null,
      amountBeforeRounding: null,
      roundingUnitVnd: configValid ? roundingUnit : null,
      roundedAmount: null,
      eligible: seniorityMonths == null ? null : applicablePercentage > 0,
      status: 'INCOMPLETE',
      incompleteData: true,
      warnings,
    }
  }

  const rateResult = selectOfficialRate(
    employee,
    referenceDay,
    rateValidation.records,
    config,
    warnings,
  )
  const amountBeforeRounding =
    rateResult.complete && isFinitePositive(rateResult.rate)
      ? rateResult.rate * basisHours * applicablePercentage
      : null
  const roundedAmount =
    amountBeforeRounding == null
      ? null
      : roundDown(amountBeforeRounding, roundingUnit)

  return {
    employeeId: employee.employee_id,
    year,
    seniorityEvaluationDate: referenceDate,
    hourlyRateReferenceDate: referenceDate,
    seniorityMonths,
    applicablePercentage,
    officialHourlyRate: rateResult.rate,
    basisHours,
    amountBeforeRounding,
    roundingUnitVnd: roundingUnit,
    roundedAmount,
    eligible: true,
    status: roundedAmount == null ? 'INCOMPLETE' : 'AVAILABLE',
    incompleteData: roundedAmount == null,
    warnings,
  }
}
