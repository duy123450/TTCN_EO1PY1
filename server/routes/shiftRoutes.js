import express from 'express'
import {
    authenticateToken,
    authorizeRoles,
} from '../middleware/authMiddleware.js'
import validateRequest from '../middleware/validateRequest.js'
import {
    employeeShiftListQuerySchema,
    managerShiftListQuerySchema,
    shiftCreateBodySchema,
    shiftIdParamsSchema,
    shiftPublishBodySchema,
    shiftUpdateBodySchema,
} from '../schemas/shiftSchema.js'
import {
    getShifts,
    getShiftById,
    createShift,
    updateShift,
    publishShifts,
    cancelShift,
} from '../controllers/shiftController.js'

const router = express.Router()

router.use(authenticateToken)

const invalidBody = (body) =>
    !body || typeof body !== 'object' || Array.isArray(body)

const invalidRangeMessage = 'Valid week_start and week_end dates are required'
const invalidShiftFieldsMessage =
    'Valid employee, work date, start time, and end time are required'

const validateManagerShiftListQuery = validateRequest(
    { query: managerShiftListQuerySchema },
    {
        message: ({ error }) =>
            error.issues.every((issue) => issue.path[0] === 'employee_id')
                ? 'Invalid employee ID'
                : invalidRangeMessage,
        includeErrors: false,
    },
)

const validateEmployeeShiftListQuery = validateRequest(
    { query: employeeShiftListQuerySchema },
    { message: invalidRangeMessage, includeErrors: false },
)

const validateShiftListQuery = (req, res, next) => {
    const validate =
        req.user.role === 'MANAGER'
            ? validateManagerShiftListQuery
            : validateEmployeeShiftListQuery
    return validate(req, res, next)
}

const validateShiftId = validateRequest(
    { params: shiftIdParamsSchema },
    { message: 'Invalid shift ID', includeErrors: false },
)

const validateShiftCreation = validateRequest(
    { body: shiftCreateBodySchema },
    {
        message: ({ req }) =>
            invalidBody(req.body)
                ? 'Invalid shift data'
                : invalidShiftFieldsMessage,
        includeErrors: false,
    },
)

const allowedUpdateFields = [
    'employee_id',
    'work_date',
    'start_time',
    'end_time',
]

const validateShiftUpdate = validateRequest(
    {
        params: shiftIdParamsSchema,
        body: shiftUpdateBodySchema,
    },
    {
        message: ({ req, part }) => {
            if (part === 'params') {
                return 'Invalid shift ID'
            }
            if (
                invalidBody(req.body) ||
                Object.keys(req.body).some(
                    (field) => !allowedUpdateFields.includes(field),
                ) ||
                allowedUpdateFields.some(
                    (field) => !Object.hasOwn(req.body, field),
                )
            ) {
                return 'Provide only employee_id, work_date, start_time, and end_time'
            }
            return invalidShiftFieldsMessage
        },
        includeErrors: false,
    },
)

const validateShiftPublishing = validateRequest(
    { body: shiftPublishBodySchema },
    { message: invalidRangeMessage, includeErrors: false },
)

router.get(
    '/',
    authorizeRoles('MANAGER', 'EMPLOYEE'),
    validateShiftListQuery,
    getShifts,
)
router.post(
    '/publish',
    authorizeRoles('MANAGER'),
    validateShiftPublishing,
    publishShifts,
)
router.patch(
    '/:id/cancel',
    authorizeRoles('MANAGER'),
    validateShiftId,
    cancelShift,
)
router.get(
    '/:id',
    authorizeRoles('MANAGER', 'EMPLOYEE'),
    validateShiftId,
    getShiftById,
)
router.post(
    '/',
    authorizeRoles('MANAGER'),
    validateShiftCreation,
    createShift,
)
router.put('/:id', authorizeRoles('MANAGER'), validateShiftUpdate, updateShift)

export default router
