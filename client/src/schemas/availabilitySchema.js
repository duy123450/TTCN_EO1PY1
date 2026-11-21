import { z } from 'zod'
import { timeStringSchema } from './commonSchemas'

const intervalSchema = z
  .object({
    key: z.string(),
    start_time: z.string(),
    end_time: z.string(),
  })
  .strict()

const daySchema = z
  .object({
    isOff: z.boolean(),
    intervals: z.array(intervalSchema),
  })
  .strict()

export const createAvailabilityFormSchema = (dayNames) =>
  z
    .object({
      days: z.array(daySchema).length(7),
    })
    .strict()
    .superRefine(({ days }, context) => {
      days.forEach((day, dayIndex) => {
        const dayName = dayNames[dayIndex]
        if (day.isOff && day.intervals.length > 0) {
          context.addIssue({
            code: 'custom',
            path: ['days', dayIndex, 'isOff'],
            message: `${dayName} cannot be off and available.`,
          })
          return
        }

        const validIntervals = []
        day.intervals.forEach((interval, intervalIndex) => {
          if (!interval.start_time || !interval.end_time) {
            const missingField = interval.start_time
              ? 'end_time'
              : 'start_time'
            context.addIssue({
              code: 'custom',
              path: [
                'days',
                dayIndex,
                'intervals',
                intervalIndex,
                missingField,
              ],
              message: `Enter both times for every ${dayName} interval.`,
            })
            return
          }

          if (
            !timeStringSchema.safeParse(interval.start_time).success ||
            !timeStringSchema.safeParse(interval.end_time).success
          ) {
            context.addIssue({
              code: 'custom',
              path: ['days', dayIndex, 'intervals', intervalIndex, 'start_time'],
              message: `Enter valid 24-hour times for every ${dayName} interval.`,
            })
            return
          }

          if (interval.start_time >= interval.end_time) {
            context.addIssue({
              code: 'custom',
              path: ['days', dayIndex, 'intervals', intervalIndex, 'end_time'],
              message: `${dayName} intervals must end after they start.`,
            })
            return
          }

          validIntervals.push({ ...interval, intervalIndex })
        })

        const sortedIntervals = [...validIntervals].sort((left, right) =>
          left.start_time.localeCompare(right.start_time),
        )
        for (let index = 1; index < sortedIntervals.length; index += 1) {
          if (
            sortedIntervals[index].start_time <
            sortedIntervals[index - 1].end_time
          ) {
            context.addIssue({
              code: 'custom',
              path: [
                'days',
                dayIndex,
                'intervals',
                sortedIntervals[index].intervalIndex,
                'start_time',
              ],
              message: `${dayName} intervals cannot overlap.`,
            })
            break
          }
        }
      })
    })
