import express from 'express'
import {
    authenticateToken,
    authorizeRoles,
} from '../middleware/authMiddleware.js'
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

router.get('/', authorizeRoles('MANAGER', 'EMPLOYEE'), getShifts)
router.post('/publish', authorizeRoles('MANAGER'), publishShifts)
router.patch('/:id/cancel', authorizeRoles('MANAGER'), cancelShift)
router.get('/:id', authorizeRoles('MANAGER', 'EMPLOYEE'), getShiftById)
router.post('/', authorizeRoles('MANAGER'), createShift)
router.put('/:id', authorizeRoles('MANAGER'), updateShift)

export default router
