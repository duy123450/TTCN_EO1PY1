import express from 'express'
import {
    authenticateToken,
    authorizeRoles
} from '../middleware/authMiddleware.js'
import { requireEmployeeOwnership } from '../middleware/employeeOwnershipMiddleware.js'
import {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
} from '../controllers/employeeController.js'

const router = express.Router()

router.use(authenticateToken)

router.get('/', authorizeRoles('MANAGER'), getEmployees)
router.get(
    '/:id',
    authorizeRoles('MANAGER', 'EMPLOYEE'),
    requireEmployeeOwnership,
    getEmployeeById
)
router.post('/', authorizeRoles('MANAGER'), createEmployee)
router.put('/:id', authorizeRoles('MANAGER'), updateEmployee)
router.delete('/:id', authorizeRoles('MANAGER'), deleteEmployee)

export default router