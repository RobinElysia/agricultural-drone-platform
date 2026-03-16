import { Router } from 'express'
import AuthController from '../controllers/auth'
import { loginRateLimit, registerRateLimit } from '../middleware/rateLimit'
import { authenticate } from '../middleware/auth'

const router = Router()

// 认证路由
router.post('/login', loginRateLimit, AuthController.login)
router.post('/register', registerRateLimit, AuthController.register)
router.post('/logout', AuthController.logout)
router.get('/profile', authenticate, AuthController.getProfile)
router.get('/users', authenticate, AuthController.getAllUsers)
router.post('/init-admin', AuthController.initAdmin)

export default router