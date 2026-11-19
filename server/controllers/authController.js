import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'
import { getJwtConfig } from '../config/jwt.js'
import {
    addRefreshToken,
    inspectRefreshToken,
    revokeRefreshToken,
    rotateRefreshToken
} from '../services/refreshTokenStore.js'

const refreshCookieName = 'refreshToken'
const allowedRoles = ['MANAGER', 'EMPLOYEE']

const cookieAttributes = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth'
})

const setRefreshCookie = (res, token, config) =>
    res.cookie(refreshCookieName, token, {
        ...cookieAttributes(),
        maxAge: config.refreshCookieMaxAge
    })

const clearRefreshCookie = (res) =>
    res.clearCookie(refreshCookieName, cookieAttributes())

const readRefreshCookie = (req) => {
    const cookieHeader = req.headers.cookie
    if (typeof cookieHeader !== 'string') {
        return null
    }

    let token = null
    for (const cookie of cookieHeader.split(';')) {
        const separator = cookie.indexOf('=')
        if (separator < 0 || cookie.slice(0, separator).trim() !== refreshCookieName) {
            continue
        }

        if (token !== null) {
            return null
        }

        try {
            token = decodeURIComponent(cookie.slice(separator + 1).trim())
        } catch {
            return null
        }
    }

    return token || null
}

const isTokenPayload = (payload, tokenType) =>
    payload &&
    typeof payload === 'object' &&
    Number.isSafeInteger(payload.user_id) &&
    payload.user_id > 0 &&
    typeof payload.username === 'string' &&
    payload.username.length > 0 &&
    allowedRoles.includes(payload.role) &&
    payload.token_type === tokenType

const invalidCredentials = (res) =>
    res.status(401).json({
        success: false,
        message: 'Invalid username or password'
    })

const invalidRefreshToken = (res) =>
    res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
    })

const getJwtConfiguration = (res) => {
    try {
        return getJwtConfig()
    } catch (error) {
        console.error('JWT configuration error:', error.message)
        res.status(500).json({
            success: false,
            message: 'Authentication service is not configured'
        })
        return null
    }
}

const createTokenPair = (user, config) => {
    const accessToken = jwt.sign(
        {
            user_id: user.user_id,
            username: user.username,
            role: user.role,
            token_type: 'access'
        },
        config.accessSecret,
        {
            algorithm: 'HS256',
            expiresIn: config.accessExpiresIn
        }
    )

    const refreshTokenId = randomUUID()
    const refreshToken = jwt.sign(
        {
            user_id: user.user_id,
            username: user.username,
            role: user.role,
            token_type: 'refresh',
            jti: refreshTokenId
        },
        config.refreshSecret,
        {
            algorithm: 'HS256',
            expiresIn: config.refreshExpiresIn
        }
    )
    const refreshPayload = jwt.decode(refreshToken)

    return {
        accessToken,
        refreshToken,
        refreshTokenId,
        refreshExpiresAt: refreshPayload.exp * 1000
    }
}

const safeUser = (user) => ({
    user_id: user.user_id,
    username: user.username,
    role: user.role
})

const login = async (req, res) => {
    const body = req.body
    if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        typeof body.username !== 'string' ||
        body.username.trim().length === 0 ||
        body.username.trim().length > 50 ||
        typeof body.password !== 'string' ||
        body.password.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        })
    }

    const config = getJwtConfiguration(res)
    if (!config) {
        return
    }

    try {
        const [users] = await pool.execute(
            `SELECT user_id, username, password_hash, role, account_status
             FROM users
             WHERE username = ?
             LIMIT 1`,
            [body.username.trim()]
        )

        const user = users[0]
        if (
            !user ||
            user.account_status !== 'ACTIVE' ||
            !allowedRoles.includes(user.role)
        ) {
            return invalidCredentials(res)
        }

        const passwordMatches = await bcrypt.compare(
            body.password,
            user.password_hash
        )

        if (!passwordMatches) {
            return invalidCredentials(res)
        }

        const tokens = createTokenPair(user, config)
        const sessionId = randomUUID()
        addRefreshToken({
            jti: tokens.refreshTokenId,
            sessionId,
            userId: user.user_id,
            token: tokens.refreshToken,
            expiresAt: tokens.refreshExpiresAt
        })
        setRefreshCookie(res, tokens.refreshToken, config)

        return res.json({
            success: true,
            data: {
                accessToken: tokens.accessToken,
                user: safeUser(user)
            }
        })
    } catch (error) {
        console.error('Login error:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to log in'
        })
    }
}

const refresh = async (req, res) => {
    const refreshToken = readRefreshCookie(req)
    if (!refreshToken) {
        return invalidRefreshToken(res)
    }

    const config = getJwtConfiguration(res)
    if (!config) {
        return
    }

    let payload
    try {
        payload = jwt.verify(refreshToken, config.refreshSecret, {
            algorithms: ['HS256']
        })
    } catch {
        return invalidRefreshToken(res)
    }

    if (
        !isTokenPayload(payload, 'refresh') ||
        typeof payload.jti !== 'string' ||
        payload.jti.length === 0
    ) {
        return invalidRefreshToken(res)
    }

    const storedToken = inspectRefreshToken(
        refreshToken,
        payload.jti,
        payload.user_id
    )
    if (storedToken.status !== 'active') {
        return invalidRefreshToken(res)
    }

    try {
        const [users] = await pool.execute(
            `SELECT user_id, username, role, account_status
             FROM users
             WHERE user_id = ?
             LIMIT 1`,
            [payload.user_id]
        )
        const user = users[0]

        if (
            !user ||
            user.account_status !== 'ACTIVE' ||
            !allowedRoles.includes(user.role)
        ) {
            revokeRefreshToken(refreshToken, payload.jti)
            return invalidRefreshToken(res)
        }

        const tokens = createTokenPair(user, config)
        const rotationStatus = rotateRefreshToken(
            refreshToken,
            payload.jti,
            user.user_id,
            {
                jti: tokens.refreshTokenId,
                token: tokens.refreshToken,
                expiresAt: tokens.refreshExpiresAt
            }
        )

        if (rotationStatus !== 'rotated') {
            return invalidRefreshToken(res)
        }

        setRefreshCookie(res, tokens.refreshToken, config)
        return res.json({
            success: true,
            data: {
                accessToken: tokens.accessToken,
                user: safeUser(user)
            }
        })
    } catch (error) {
        console.error('Refresh token error:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to refresh authentication'
        })
    }
}

const logout = (req, res) => {
    const refreshToken = readRefreshCookie(req)
    if (refreshToken) {
        const payload = jwt.decode(refreshToken)
        if (
            payload &&
            typeof payload === 'object' &&
            typeof payload.jti === 'string'
        ) {
            revokeRefreshToken(refreshToken, payload.jti)
        }
    }

    clearRefreshCookie(res)
    return res.json({
        success: true,
        message: 'Logged out'
    })
}

export { login, refresh, logout }
