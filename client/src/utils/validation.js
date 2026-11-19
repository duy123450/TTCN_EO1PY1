export const normalizeUsername = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

export const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

export const validateLoginInput = ({ username, password }) => {
  const normalizedUsername = normalizeUsername(username)

  if (!normalizedUsername) {
    return 'Username is required.'
  }

  if (normalizedUsername.length > 50) {
    return 'Username is too long.'
  }

  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required.'
  }

  return ''
}

export const validateName = (value, fieldName = 'Name') => {
  const normalized = normalizeText(value)

  if (!normalized) {
    return `${fieldName} is required.`
  }

  if (normalized.length > 100) {
    return `${fieldName} is too long.`
  }

  return ''
}

export const validatePhone = (value) => {
  const normalized = normalizeText(value)

  if (!normalized) {
    return 'Phone number is required.'
  }

  if (!/^(?:\+[0-9]{8,14}|[0-9]{8,15})$/.test(normalized)) {
    return 'Phone number is invalid.'
  }

  return ''
}

export const validateDate = (value, fieldName = 'Date') => {
  const normalized = normalizeText(value)

  if (!normalized) {
    return `${fieldName} is required.`
  }

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return `${fieldName} is invalid.`
  }

  const dateParts = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/)
  if (dateParts) {
    const [, year, month, day] = dateParts
    const calendarDate = new Date(0)
    calendarDate.setUTCFullYear(Number(year), Number(month) - 1, Number(day))

    if (
      calendarDate.getUTCFullYear() !== Number(year) ||
      calendarDate.getUTCMonth() + 1 !== Number(month) ||
      calendarDate.getUTCDate() !== Number(day)
    ) {
      return `${fieldName} is invalid.`
    }
  }

  return ''
}

export const validateEnum = (value, allowedValues, fieldName = 'Selection') => {
  if (!allowedValues.includes(value)) {
    return `${fieldName} is invalid.`
  }

  return ''
}
