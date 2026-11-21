import { z } from 'zod'
import {
  dateStringSchema,
  positiveIntegerIdSchema,
  timeStringSchema,
} from './commonSchemas'

const minutesOf = (value) => {
  const parsed = timeStringSchema.safeParse(value)
  if (!parsed.success) {
    return null
  }

  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export const createShiftEditorSchema = ({
  employees,
  weekStart,
  weekEnd,
  existingShifts,
  excludedShiftId,
}) =>
  z
    .object({
      employee_id: z
        .string()
        .refine(
          (value) =>
            positiveIntegerIdSchema.safeParse(value).success &&
            employees.some(
              (employee) => String(employee.employee_id) === value,
            ),
          { error: 'Select an employee for this shift.' },
        )
        .transform((value) => positiveIntegerIdSchema.parse(value)),
      work_date: z.string().refine(
        (value) => dateStringSchema.safeParse(value).success,
        { error: 'Enter a valid work date.' },
      ),
      start_time: z.string().refine(
        (value) => timeStringSchema.safeParse(value).success,
        { error: 'Enter a valid start time and end time.' },
      ),
      end_time: z.string().refine(
        (value) => timeStringSchema.safeParse(value).success,
        { error: 'Enter a valid start time and end time.' },
      ),
    })
    .strict()
    .superRefine((shift, context) => {
      if (
        dateStringSchema.safeParse(shift.work_date).success &&
        (shift.work_date < weekStart || shift.work_date > weekEnd)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['work_date'],
          message: 'The work date must be within the selected week.',
        })
      }

      const startMinutes = minutesOf(shift.start_time)
      const endMinutes = minutesOf(shift.end_time)
      if (startMinutes === null || endMinutes === null) {
        return
      }
      if (endMinutes <= startMinutes) {
        context.addIssue({
          code: 'custom',
          path: ['end_time'],
          message:
            'The end time must be later than the start time. Overnight shifts are not allowed.',
        })
        return
      }

      const overlaps = existingShifts.some((existingShift) => {
        if (
          existingShift.shift_id === excludedShiftId ||
          existingShift.employee_id !== shift.employee_id ||
          existingShift.work_date !== shift.work_date
        ) {
          return false
        }

        const existingStart = minutesOf(
          typeof existingShift.start_time === 'string'
            ? existingShift.start_time.slice(0, 5)
            : '',
        )
        const existingEnd = minutesOf(
          typeof existingShift.end_time === 'string'
            ? existingShift.end_time.slice(0, 5)
            : '',
        )
        return (
          existingStart !== null &&
          existingEnd !== null &&
          startMinutes < existingEnd &&
          endMinutes > existingStart
        )
      })

      if (overlaps) {
        context.addIssue({
          code: 'custom',
          path: ['shift'],
          message:
            'This shift overlaps another shift assigned to the same employee on this date.',
        })
      }
    })
