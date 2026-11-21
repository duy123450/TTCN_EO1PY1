import { z } from 'zod'
import {
    dateStringSchema,
    positiveIntegerIdSchema,
    timeStringSchema,
} from './commonSchemas.js'

const timeWithOptionalSecondsSchema = z.union([
    timeStringSchema.transform((value) => `${value}:00`),
    z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/),
])

const rangeShape = {
    week_start: dateStringSchema,
    week_end: dateStringSchema,
}

const hasOrderedRange = ({ week_start: weekStart, week_end: weekEnd }) =>
    weekStart <= weekEnd

const rangeError = 'Valid week_start and week_end dates are required'

export const managerShiftListQuerySchema = z
    .object({
        ...rangeShape,
        employee_id: positiveIntegerIdSchema.optional(),
    })
    .refine(hasOrderedRange, { error: rangeError })

export const employeeShiftListQuerySchema = z
    .object(rangeShape)
    .refine(hasOrderedRange, { error: rangeError })

export const shiftIdParamsSchema = z.object({
    id: positiveIntegerIdSchema,
})

const shiftFields = {
    employee_id: positiveIntegerIdSchema,
    work_date: dateStringSchema,
    start_time: timeWithOptionalSecondsSchema,
    end_time: timeWithOptionalSecondsSchema,
}

const hasOrderedShiftTimes = ({ start_time: startTime, end_time: endTime }) =>
    endTime > startTime

const shiftTimeError =
    'Valid employee, work date, start time, and end time are required'

export const shiftCreateBodySchema = z
    .object(shiftFields)
    .refine(hasOrderedShiftTimes, { error: shiftTimeError })

export const shiftUpdateBodySchema = z
    .object(shiftFields)
    .strict()
    .refine(hasOrderedShiftTimes, { error: shiftTimeError })

export const shiftPublishBodySchema = z
    .object(rangeShape)
    .refine(hasOrderedRange, { error: rangeError })
