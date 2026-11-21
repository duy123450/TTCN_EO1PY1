import { z } from 'zod'
import {
  dateStringSchema,
} from './commonSchemas'

const requiredText = (fieldName, maxLength) =>
  z
    .string()
    .trim()
    .min(1, { error: `${fieldName} is required.` })
    .max(maxLength, { error: `${fieldName} is too long.` })

const optionalDateSchema = z
  .union([z.string(), z.null()])
  .refine(
    (value) => value === null || dateStringSchema.safeParse(value).success,
    { error: 'Date of Birth is invalid.' },
  )

const requiredDateSchema = z
  .string()
  .min(1, { error: 'Start Date is required.' })
  .refine((value) => dateStringSchema.safeParse(value).success, {
    error: 'Start Date is invalid.',
  })

const employeeTypeSchema = z.enum(['PART_TIME', 'FULL_TIME'], {
  error: 'Employee Type is invalid.',
})
const employmentStatusSchema = z.enum(
  ['ACTIVE', 'ON_LEAVE', 'RESIGNED'],
  { error: 'Employment Status is invalid.' },
)
const probationStatusSchema = z.enum(
  ['NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED'],
  { error: 'Probation Status is invalid.' },
)

const employeeFields = {
  full_name: requiredText('Full Name', 100),
  phone: requiredText('Phone number', 15),
  date_of_birth: optionalDateSchema,
  employee_type: employeeTypeSchema,
  start_date: requiredDateSchema,
}

const editableFields = {
  ...employeeFields,
  employment_status: employmentStatusSchema,
  probation_status: probationStatusSchema,
}

export const employeeCreateSchema = z
  .object({
    username: requiredText('Username', 50),
    password: z.string().min(1, { error: 'Password is required.' }),
    ...employeeFields,
  })
  .strict()

export const employeeUpdateSchema = z
  .object(editableFields)
  .strict()
  .partial()
  .refine((employee) => Object.keys(employee).length > 0, {
    error: 'Provide at least one employee field to update.',
  })
