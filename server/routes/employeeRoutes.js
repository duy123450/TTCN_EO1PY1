import express from 'express'
const router = express.Router()

import {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
} from '../controllers/employeeController.js'

router.get('/', getEmployees)
router.get('/:id', getEmployeeById)
router.post('/', createEmployee)
router.put('/:id', updateEmployee)
router.delete('/:id', deleteEmployee)

export default router