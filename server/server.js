import express from 'express'
import cors from 'cors'
import pool from './config/db.js'

import employeeRoutes from './routes/employeeRoutes.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/api/employees', employeeRoutes)

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
