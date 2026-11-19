import { createHash, timingSafeEqual } from 'node:crypto'

const refreshTokens = new Map()

const hashToken = (token) =>
    createHash('sha256').update(token, 'utf8').digest()

const tokenMatchesRecord = (token, record) => {
    const suppliedHash = hashToken(token)

    return (
        suppliedHash.length === record.tokenHash.length &&
        timingSafeEqual(suppliedHash, record.tokenHash)
    )
}

const pruneExpiredTokens = () => {
    const now = Date.now()

    for (const [jti, record] of refreshTokens) {
        if (record.expiresAt <= now) {
            refreshTokens.delete(jti)
        }
    }
}

const revokeSession = (sessionId) => {
    for (const record of refreshTokens.values()) {
        if (record.sessionId === sessionId) {
            record.status = 'revoked'
        }
    }
}

const storeToken = ({ jti, sessionId, userId, token, expiresAt }) => {
    refreshTokens.set(jti, {
        sessionId,
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        status: 'active'
    })
}

const addRefreshToken = (tokenData) => {
    pruneExpiredTokens()
    storeToken(tokenData)
}

const inspectRefreshToken = (token, jti, userId) => {
    pruneExpiredTokens()
    const record = refreshTokens.get(jti)

    if (!record) {
        return { status: 'missing' }
    }

    if (!tokenMatchesRecord(token, record)) {
        revokeSession(record.sessionId)
        return { status: 'invalid' }
    }

    if (record.status === 'rotated') {
        revokeSession(record.sessionId)
        return { status: 'reused' }
    }

    if (record.status !== 'active') {
        return { status: 'revoked' }
    }

    if (record.userId !== userId) {
        revokeSession(record.sessionId)
        return { status: 'invalid' }
    }

    return {
        status: 'active',
        record
    }
}

const rotateRefreshToken = (oldToken, oldJti, userId, newTokenData) => {
    const result = inspectRefreshToken(oldToken, oldJti, userId)
    if (result.status !== 'active') {
        return result.status
    }

    result.record.status = 'rotated'
    storeToken({
        ...newTokenData,
        sessionId: result.record.sessionId,
        userId
    })

    return 'rotated'
}

const revokeRefreshToken = (token, jti) => {
    pruneExpiredTokens()
    const record = refreshTokens.get(jti)

    if (!record || !tokenMatchesRecord(token, record)) {
        return false
    }

    revokeSession(record.sessionId)
    return true
}

export {
    addRefreshToken,
    inspectRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken
}
