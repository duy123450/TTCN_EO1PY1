import express from 'express'
import {
    authenticateToken,
    authorizeRoles,
} from '../middleware/authMiddleware.js'
import {
    getAvailability,
    replaceMyAvailability,
} from '../controllers/availabilityController.js'

const router = express.Router()

router.use(authenticateToken)

router.get('/', authorizeRoles('MANAGER', 'EMPLOYEE'), getAvailability)
router.put('/me', authorizeRoles('EMPLOYEE'), replaceMyAvailability)

export default router
