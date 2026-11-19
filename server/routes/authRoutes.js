import express from 'express'
import { login, refresh, logout } from '../controllers/authController.js'

const router = express.Router()

router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', logout)

// Logout clears the refresh cookie; clients should discard their access token.
// Refresh sessions are in-memory and are invalidated when the server restarts.

export default router
