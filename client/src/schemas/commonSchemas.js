import { z } from 'zod'

const idInputSchema = z.union([z.number(), z.string()], {
  error: 'Enter a positive whole-number ID.',
})

export const positiveIntegerIdSchema = idInputSchema
  .transform((value) => {
    if (typeof value !== 'string') {
      return value
    }

    return /^\d+$/.test(value) ? Number(value) : Number.NaN
  })
  .refine(
    (value) => Number.isSafeInteger(value) && value > 0,
    'Enter a positive whole-number ID.',
  )

const isValidCalendarDate = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth[month - 1]
  )
}

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    error: 'Use the date format YYYY-MM-DD.',
  })
  .refine(isValidCalendarDate, {
    error: 'Enter a valid calendar date.',
  })

export const timeStringSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    error: 'Use a valid 24-hour time in HH:mm format.',
  })
