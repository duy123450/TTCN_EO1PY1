import express from 'express'
import {
    authenticateToken,
    authorizeRoles
} from '../middleware/authMiddleware.js'
import validateRequest from '../middleware/validateRequest.js'
import { requireEmployeeOwnership } from '../middleware/employeeOwnershipMiddleware.js'
import {
    employeeCreateSchema,
    employeeIdParamsSchema,
    employeeUpdateSchema,
} from '../schemas/employeeSchema.js'
import {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
} from '../controllers/employeeController.js'

const router = express.Router()

router.use(authenticateToken)

const isInvalidBody = (body) =>
    !body || typeof body !== 'object' || Array.isArray(body)

const validateEmployeeId = validateRequest(
    { params: employeeIdParamsSchema },
    { message: 'Invalid employee ID', includeErrors: false },
)

const validateEmployeeCreation = validateRequest(
    { body: employeeCreateSchema },
    {
        message: ({ req }) =>
            isInvalidBody(req.body)
                ? 'Invalid employee data'
                : 'Invalid or missing employee fields',
        includeErrors: false,
    },
)

const validateEmployeeUpdate = validateRequest(
    {
        params: employeeIdParamsSchema,
        body: employeeUpdateSchema,
    },
    {
        message: ({ req, part }) => {
            if (part === 'params') {
                return 'Invalid employee ID'
            }
            if (isInvalidBody(req.body)) {
                return 'Invalid employee data'
            }

            const allowedFields = [
                'full_name',
                'phone',
                'date_of_birth',
                'employee_type',
                'start_date',
                'employment_status',
                'probation_status',
            ]
            const submittedFields = Object.keys(req.body)
            if (
                submittedFields.length === 0 ||
                submittedFields.some((field) => !allowedFields.includes(field))
            ) {
                return 'No editable employee fields provided'
            }
            return 'Invalid employee field value'
        },
        includeErrors: false,
    },
)

router.get('/', authorizeRoles('MANAGER'), getEmployees)
router.get(
    '/:id',
    authorizeRoles('MANAGER', 'EMPLOYEE'),
    validateEmployeeId,
    requireEmployeeOwnership,
    getEmployeeById
)
router.post('/', authorizeRoles('MANAGER'), validateEmployeeCreation, createEmployee)
router.put('/:id', authorizeRoles('MANAGER'), validateEmployeeUpdate, updateEmployee)
router.delete('/:id', authorizeRoles('MANAGER'), validateEmployeeId, deleteEmployee)

export default router