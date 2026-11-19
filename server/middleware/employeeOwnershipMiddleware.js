import pool from '../config/db.js'

const requireEmployeeOwnership = async (req, res, next) => {
    if (req.user.role === 'MANAGER') {
        return next()
    }

    const employeeId = Number(req.params.id)
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
        return next()
    }

    try {
        const [employees] = await pool.execute(
            `SELECT e.employee_id
             FROM employees e
             INNER JOIN users u ON u.user_id = e.user_id
             WHERE u.user_id = ? AND e.employee_id = ?
             LIMIT 1`,
            [req.user.user_id, employeeId]
        )

        if (employees.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            })
        }

        return next()
    } catch (error) {
        console.error('Employee ownership check failed:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to verify employee access'
        })
    }
}

export { requireEmployeeOwnership }
