import { timingSafeEqual } from 'node:crypto'

const getSecret = (value, name) => {
    if (
        typeof value !== 'string' ||
        value.trim().length === 0 ||
        Buffer.byteLength(value, 'utf8') < 32
    ) {
        throw new Error(`${name} must be configured with at least 32 bytes`)
    }

    return value
}

const getDuration = (value, name) => {
    if (typeof value !== 'string') {
        throw new Error(`${name} must be configured`)
    }

    const normalized = value.trim()
    const match = /^([1-9]\d*)(s|m|h|d)$/.exec(normalized)
    if (!match) {
        throw new Error(`${name} must be a positive duration such as 15m or 7d`)
    }

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    }
    const milliseconds = Number(match[1]) * multipliers[match[2]]

    if (!Number.isSafeInteger(milliseconds)) {
        throw new Error(`${name} is outside the supported range`)
    }

    return {
        value: normalized,
        milliseconds
    }
}

export const getJwtConfig = () => {
    const accessSecret = getSecret(
        process.env.JWT_ACCESS_SECRET,
        'JWT_ACCESS_SECRET'
    )
    const refreshSecret = getSecret(
        process.env.JWT_REFRESH_SECRET,
        'JWT_REFRESH_SECRET'
    )
    const accessSecretBytes = Buffer.from(accessSecret, 'utf8')
    const refreshSecretBytes = Buffer.from(refreshSecret, 'utf8')

    if (
        accessSecretBytes.length === refreshSecretBytes.length &&
        timingSafeEqual(accessSecretBytes, refreshSecretBytes)
    ) {
        throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ')
    }

    const accessDuration = getDuration(
        process.env.JWT_ACCESS_EXPIRES_IN,
        'JWT_ACCESS_EXPIRES_IN'
    )
    const refreshDuration = getDuration(
        process.env.JWT_REFRESH_EXPIRES_IN,
        'JWT_REFRESH_EXPIRES_IN'
    )

    return {
        accessSecret,
        refreshSecret,
        accessExpiresIn: accessDuration.value,
        refreshExpiresIn: refreshDuration.value,
        refreshCookieMaxAge: refreshDuration.milliseconds
    }
}
