import express from 'express'
import cors from 'cors'
import pool from './config/db.js'

import authRoutes from './routes/authRoutes.js'
import employeeRoutes from './routes/employeeRoutes.js'
import shiftRoutes from './routes/shiftRoutes.js'
import availabilityRoutes from './routes/availabilityRoutes.js'
import attendanceRoutes from './routes/attendanceRoutes.js'

const app = express()
const PORT = process.env.PORT || 3000
const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
const allowedOrigins = new Set(
    configuredOrigins.length > 0
        ? configuredOrigins
        : ['http://localhost:5173']
)

if (allowedOrigins.has('*')) {
    throw new Error('CORS_ORIGINS must list exact origins when credentials are enabled')
}

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.has(origin)) {
                return callback(null, true)
            }

            return callback(null, false)
        },
        credentials: true
    })
)
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/shifts', shiftRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/attendance', attendanceRoutes)

app.get('/', (req, res) => {
    res.json({
        message: 'Crane Tea HRM API is running!'
    })
})

app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS result')

        res.json({
            status: 'OK',
            database: rows[0].result === 1 ? 'Connected' : 'Disconnected'
        })
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            database: 'Disconnected',
            message: error.message
        })
    }
})

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
})
