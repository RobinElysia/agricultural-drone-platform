import { Router } from 'express'
import EnvironmentController from '../controllers/environment'

const router = Router()

// 环境路由
router.get('/', EnvironmentController.getEnvironment)
router.post('/subscribe', EnvironmentController.subscribeEnvironment)
router.post('/update', EnvironmentController.updateEnvironment)
router.get('/history', EnvironmentController.getEnvironmentHistory)

export default router