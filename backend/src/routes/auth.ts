import { Router } from 'express'
import AuthController from '../controllers/auth'
import { loginRateLimit, registerRateLimit } from '../middleware/rateLimit'
import { authenticate } from '../middleware/auth'

const registerRoleAliases: Record<string, string> = {
  管理员: 'admin',
  作业员: 'operator',
  农业员: 'agriculturalist',
  admin: 'admin',
  administrator: 'admin',
  operator: 'operator',
  agriculturalist: 'agriculturalist',
  farmer: 'agriculturalist'
}

const normalizeRegisterRole = (req: any, _res: any, next: any) => {
  const rawRole = req.body?.role
  if (typeof rawRole === 'string') {
    const trimmed = rawRole.trim()
    const normalized =
      registerRoleAliases[trimmed] ?? registerRoleAliases[trimmed.toLowerCase()]
    req.body.role = normalized || trimmed
  }
  next()
}

const router = Router()

// 认证路由
router.post('/login', loginRateLimit, AuthController.login)
router.post('/register', registerRateLimit, normalizeRegisterRole, AuthController.register)
router.post('/logout', AuthController.logout)
router.get('/profile', authenticate, AuthController.getProfile)
router.get('/users', authenticate, AuthController.getAllUsers)
router.post('/init-admin', AuthController.initAdmin)

export default router
