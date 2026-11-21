import { z } from 'zod'
import {
    dateStringSchema,
    positiveIntegerIdSchema,
} from './commonSchemas.js'

const employeeTypeSchema = z.enum(['PART_TIME', 'FULL_TIME'])
const employmentStatusSchema = z.enum(['ACTIVE', 'ON_LEAVE', 'RESIGNED'])
const probationStatusSchema = z.enum([
    'NOT_STARTED',
    'IN_PROGRESS',
    'PASSED',
    'FAILED',
])

const requiredNonWhitespaceString = (maxLength) =>
    z.string().refine((value) => {
        const trimmedValue = value.trim()
        return trimmedValue.length > 0 && trimmedValue.length <= maxLength
    })

export const employeeIdParamsSchema = z.object({
    id: positiveIntegerIdSchema,
})

export const employeeCreateSchema = z.object({
    username: requiredNonWhitespaceString(50),
    password: z.string().min(1),
    full_name: requiredNonWhitespaceString(100),
    phone: requiredNonWhitespaceString(15),
    date_of_birth: dateStringSchema.nullable().default(null),
    employee_type: employeeTypeSchema,
    start_date: dateStringSchema,
})

export const employeeUpdateSchema = z
    .object({
        full_name: requiredNonWhitespaceString(100).optional(),
        phone: requiredNonWhitespaceString(15).optional(),
        date_of_birth: dateStringSchema.nullable().optional(),
        employee_type: employeeTypeSchema.optional(),
        start_date: dateStringSchema.optional(),
        employment_status: employmentStatusSchema.optional(),
        probation_status: probationStatusSchema.optional(),
    })
    .strict()
    .refine((employee) => Object.keys(employee).length > 0)
