import jwt from 'jsonwebtoken'
import { getJwtConfig } from '../config/jwt.js'

const roles = ['MANAGER', 'EMPLOYEE']

const authenticateToken = (req, res, next) => {
    const authorization = req.get('authorization')
    const tokenMatch =
        typeof authorization === 'string'
            ? authorization.match(/^Bearer\s+(\S+)$/i)
            : null

    if (!tokenMatch) {
        return res.status(401).json({
            success: false,
            message: 'Authentication token is required'
        })
    }

    let config
    try {
        config = getJwtConfig()
    } catch (error) {
        console.error('JWT configuration error:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Authentication service is not configured'
        })
    }

    let payload
    try {
        payload = jwt.verify(tokenMatch[1], config.accessSecret, {
            algorithms: ['HS256']
        })
    } catch {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token'
        })
    }

    if (
        !payload ||
        typeof payload !== 'object' ||
        !Number.isSafeInteger(payload.user_id) ||
        payload.user_id <= 0 ||
        typeof payload.username !== 'string' ||
        !roles.includes(payload.role) ||
        payload.token_type !== 'access'
    ) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token'
        })
    }

    req.user = {
        user_id: payload.user_id,
        role: payload.role
    }

    return next()
}

const authorizeRoles = (...allowedRoles) => {
    if (
        allowedRoles.length === 0 ||
        allowedRoles.some((role) => !roles.includes(role))
    ) {
        throw new TypeError('At least one valid role must be specified')
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication is required'
            })
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            })
        }

        return next()
    }
}

export { authenticateToken, authorizeRoles }
