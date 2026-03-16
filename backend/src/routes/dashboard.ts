import { Router } from 'express'
import DashboardController from '../controllers/dashboard'

const router = Router()

// 仪表板路由
router.get('/', DashboardController.getDashboardData)
router.get('/realtime', DashboardController.getRealtimeData)
router.get('/statistics', DashboardController.getStatistics)

export default router