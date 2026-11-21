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

const allowedAvailabilityEntryFields = new Set([
    'day_of_week',
    'start_time',
    'end_time',
    'is_off',
])

export const managerAvailabilityQuerySchema = z.object({
    week_start: dateStringSchema,
    employee_id: positiveIntegerIdSchema.optional(),
})

export const employeeAvailabilityQuerySchema = z.object({
    week_start: dateStringSchema,
})

const availabilityEntrySchema = z
    .unknown()
    .superRefine((entry, context) => {
        if (
            !entry ||
            typeof entry !== 'object' ||
            Array.isArray(entry) ||
            Object.keys(entry).some(
                (field) => !allowedAvailabilityEntryFields.has(field),
            ) ||
            !Object.hasOwn(entry, 'day_of_week') ||
            !Object.hasOwn(entry, 'is_off')
        ) {
            context.addIssue({
                code: 'custom',
                message: 'Each availability entry must contain valid fields only',
            })
            return
        }

        const { day_of_week: dayOfWeek, is_off: isOff } = entry
        if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
            context.addIssue({
                code: 'custom',
                path: ['day_of_week'],
                message: 'day_of_week must be an integer from 1 to 7',
            })
            return
        }
        if (typeof isOff !== 'boolean') {
            context.addIssue({
                code: 'custom',
                path: ['is_off'],
                message: 'is_off must be a boolean',
            })
            return
        }

        if (isOff) {
            if (
                !Object.hasOwn(entry, 'start_time') ||
                !Object.hasOwn(entry, 'end_time') ||
                entry.start_time !== null ||
                entry.end_time !== null
            ) {
                context.addIssue({
                    code: 'custom',
                    message: 'Off-day start_time and end_time must be null',
                })
            }
            return
        }

        const startTime = timeWithOptionalSecondsSchema.safeParse(
            entry.start_time,
        )
        const endTime = timeWithOptionalSecondsSchema.safeParse(entry.end_time)
        if (
            !startTime.success ||
            !endTime.success ||
            endTime.data <= startTime.data
        ) {
            context.addIssue({
                code: 'custom',
                message:
                    'Availability requires valid times with end_time later than start_time',
            })
        }
    })
    .transform((entry) => {
        if (
            !entry ||
            typeof entry !== 'object' ||
            Array.isArray(entry) ||
            Object.keys(entry).some(
                (field) => !allowedAvailabilityEntryFields.has(field),
            ) ||
            !Object.hasOwn(entry, 'day_of_week') ||
            !Object.hasOwn(entry, 'is_off')
        ) {
            return entry
        }

        const { day_of_week: dayOfWeek, is_off: isOff } = entry
        if (
            !Number.isInteger(dayOfWeek) ||
            dayOfWeek < 1 ||
            dayOfWeek > 7 ||
            typeof isOff !== 'boolean'
        ) {
            return entry
        }

        if (isOff) {
            if (
                !Object.hasOwn(entry, 'start_time') ||
                !Object.hasOwn(entry, 'end_time') ||
                entry.start_time !== null ||
                entry.end_time !== null
            ) {
                return entry
            }

            return {
                day_of_week: dayOfWeek,
                start_time: null,
                end_time: null,
                is_off: true,
            }
        }

        const startTime = timeWithOptionalSecondsSchema.safeParse(
            entry.start_time,
        )
        const endTime = timeWithOptionalSecondsSchema.safeParse(entry.end_time)
        if (
            !startTime.success ||
            !endTime.success ||
            endTime.data <= startTime.data
        ) {
            return entry
        }

        return {
            day_of_week: dayOfWeek,
            start_time: startTime.data,
            end_time: endTime.data,
            is_off: false,
        }
    })

const availabilityEntriesSchema = z
    .array(availabilityEntrySchema)
    .superRefine((entries, context) => {
        const offDays = new Set()
        const intervalsByDay = new Map()

        for (const [index, entry] of entries.entries()) {
            if (
                !entry ||
                typeof entry !== 'object' ||
                Array.isArray(entry) ||
                !Number.isInteger(entry.day_of_week) ||
                entry.day_of_week < 1 ||
                entry.day_of_week > 7 ||
                typeof entry.is_off !== 'boolean'
            ) {
                continue
            }

            const dayOfWeek = entry.day_of_week
            if (entry.is_off) {
                if (entry.start_time !== null || entry.end_time !== null) {
                    continue
                }
                if (
                    offDays.has(dayOfWeek) ||
                    intervalsByDay.has(dayOfWeek)
                ) {
                    context.addIssue({
                        code: 'custom',
                        path: [index, 'day_of_week'],
                        message: 'An off day cannot contain other entries',
                    })
                    return
                }
                offDays.add(dayOfWeek)
                continue
            }

            const startTime = timeWithOptionalSecondsSchema.safeParse(
                entry.start_time,
            )
            const endTime = timeWithOptionalSecondsSchema.safeParse(
                entry.end_time,
            )
            if (
                !startTime.success ||
                !endTime.success ||
                endTime.data <= startTime.data
            ) {
                continue
            }

            if (offDays.has(dayOfWeek)) {
                context.addIssue({
                    code: 'custom',
                    path: [index, 'day_of_week'],
                    message: 'An off day cannot contain working intervals',
                })
                return
            }

            const intervals = intervalsByDay.get(dayOfWeek) ?? []
            intervals.push({
                index,
                start_time: startTime.data,
                end_time: endTime.data,
            })
            intervalsByDay.set(dayOfWeek, intervals)
        }

        for (const intervals of intervalsByDay.values()) {
            intervals.sort((left, right) =>
                left.start_time.localeCompare(right.start_time),
            )
            for (let index = 1; index < intervals.length; index += 1) {
                if (
                    intervals[index].start_time <
                    intervals[index - 1].end_time
                ) {
                    context.addIssue({
                        code: 'custom',
                        path: [intervals[index].index, 'start_time'],
                        message: 'Availability intervals on a day cannot overlap',
                    })
                    return
                }
            }
        }
    })

export const availabilityBodySchema = z
    .object({
        week_start: dateStringSchema,
        availability: availabilityEntriesSchema,
    })
    .strict()
