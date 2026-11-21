import express from 'express'
import {
    authenticateToken,
    authorizeRoles,
} from '../middleware/authMiddleware.js'
import validateRequest from '../middleware/validateRequest.js'
import {
    attendanceCheckInBodySchema,
    attendanceCheckOutBodySchema,
    employeeAttendanceQuerySchema,
    managerAttendanceQuerySchema,
} from '../schemas/attendanceSchema.js'
import {
    checkIn,
    checkOut,
    getAttendance,
} from '../controllers/attendanceController.js'

const router = express.Router()

router.use(authenticateToken)

const validateCheckIn = validateRequest(
    { body: attendanceCheckInBodySchema },
    { message: 'Invalid attendance check-in data', includeErrors: false },
)

const validateCheckOut = validateRequest(
    { body: attendanceCheckOutBodySchema },
    { message: 'Check-out does not accept request fields', includeErrors: false },
)

const validateManagerAttendanceQuery = validateRequest(
    { query: managerAttendanceQuerySchema },
    { message: 'Invalid attendance filters', includeErrors: false },
)

const validateEmployeeAttendanceQuery = validateRequest(
    { query: employeeAttendanceQuerySchema },
    { message: 'Invalid attendance filters', includeErrors: false },
)

const validateAttendanceQuery = (req, res, next) => {
    const validate =
        req.user.role === 'MANAGER'
            ? validateManagerAttendanceQuery
            : validateEmployeeAttendanceQuery
    return validate(req, res, next)
}

router.post(
    '/check-in',
    authorizeRoles('EMPLOYEE'),
    validateCheckIn,
    checkIn,
)
router.post(
    '/check-out',
    authorizeRoles('EMPLOYEE'),
    validateCheckOut,
    checkOut,
)
router.get(
    '/',
    authorizeRoles('MANAGER', 'EMPLOYEE'),
    validateAttendanceQuery,
    getAttendance,
)

export default router
