import express from 'express'
import {
    authenticateToken,
    authorizeRoles,
} from '../middleware/authMiddleware.js'
import validateRequest from '../middleware/validateRequest.js'
import {
    employeeAvailabilityQuerySchema,
    availabilityBodySchema,
    managerAvailabilityQuerySchema,
} from '../schemas/availabilitySchema.js'
import {
    getAvailability,
    replaceMyAvailability,
} from '../controllers/availabilityController.js'

const router = express.Router()

router.use(authenticateToken)

const invalidBody = (body) =>
    !body || typeof body !== 'object' || Array.isArray(body)

const invalidAvailabilityWeekMessage =
    'A valid week_start date is required'

const validateManagerAvailabilityQuery = validateRequest(
    { query: managerAvailabilityQuerySchema },
    {
        message: ({ error }) =>
            error.issues.every((issue) => issue.path[0] === 'employee_id')
                ? 'Invalid employee ID'
                : invalidAvailabilityWeekMessage,
        includeErrors: false,
    },
)

const validateEmployeeAvailabilityQuery = validateRequest(
    { query: employeeAvailabilityQuerySchema },
    { message: invalidAvailabilityWeekMessage, includeErrors: false },
)

const validateAvailabilityQuery = (req, res, next) => {
    const validate =
        req.user.role === 'MANAGER'
            ? validateManagerAvailabilityQuery
            : validateEmployeeAvailabilityQuery
    return validate(req, res, next)
}

const validateAvailabilityBody = validateRequest(
    { body: availabilityBodySchema },
    {
        message: ({ req, error }) => {
            const body = req.body
            const allowedFields = ['week_start', 'availability']
            if (
                invalidBody(body) ||
                Object.keys(body).some(
                    (field) => !allowedFields.includes(field),
                ) ||
                error.issues.some((issue) => issue.path[0] === 'week_start')
            ) {
                return 'Provide a valid week_start and availability array only'
            }
            if (!Array.isArray(body.availability)) {
                return 'availability must be an array'
            }
            return error.issues[0]?.message ??
                'Each availability entry must contain valid fields only'
        },
        includeErrors: false,
    },
)

router.get(
    '/',
    authorizeRoles('MANAGER', 'EMPLOYEE'),
    validateAvailabilityQuery,
    getAvailability,
)
router.put(
    '/me',
    authorizeRoles('EMPLOYEE'),
    validateAvailabilityBody,
    replaceMyAvailability,
)

export default router
