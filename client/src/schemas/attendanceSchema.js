import { z } from 'zod'
import {
  dateStringSchema,
  positiveIntegerIdSchema,
} from './commonSchemas.js'

const dateRangeShape = {
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
}

const hasOrderedDateRange = ({ start_date: startDate, end_date: endDate }) =>
  startDate === undefined || endDate === undefined || startDate <= endDate

const dateRangeError = 'Start date must not be after end date.'

export const attendanceCheckInBodySchema = z
  .object({
    shift_id: positiveIntegerIdSchema,
  })
  .strict()

export const attendanceCheckOutBodySchema = z.object({}).strict()

export const managerAttendanceQuerySchema = z
  .object({
    ...dateRangeShape,
    employee_id: positiveIntegerIdSchema.optional(),
  })
  .strict()
  .refine(hasOrderedDateRange, { error: dateRangeError })

export const employeeAttendanceQuerySchema = z
  .object({
    ...dateRangeShape,
    employee_id: z.unknown().optional(),
  })
  .strict()
  .refine(hasOrderedDateRange, { error: dateRangeError })
