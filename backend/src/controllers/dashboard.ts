import { Request, Response } from 'express'
import { ResponseUtil } from '../utils/response'
import redisService from '../services/redis'

// 仪表板控制器
export class DashboardController {
  // 获取仪表板数据
  static async getDashboardData(req: Request, res: Response) {
    try {
      // 并行获取所有数据
      const [drones, environment, targets, users, chargingStations, operations] = await Promise.all([
        redisService.getAllDrones(),
        redisService.getLatestEnvironment(),
        redisService.getAllTargets(),
        redisService.getAllUsers(),
        redisService.getAllChargingStations(),
        redisService.getAllOperations()
      ])

      // 获取活跃操作（状态为pending或executing）
      const activeOperations = operations.filter(op => 
        op.status === 'pending' || op.status === 'executing'
      )

      // 生成模拟告警
      const alerts = []
      
      // 检查无人机状态
      drones.forEach(drone => {
        if (drone.battery < 20) {
          alerts.push({
            id: `alert-${drone.id}`,
            type: 'warning',
            message: `无人机 ${drone.name} 电量不足（${drone.battery}%）`,
            timestamp: new Date().toISOString()
          })
        }
        
        if (drone.status === 'offline') {
          alerts.push({
            id: `alert-${drone.id}`,
            type: 'error',
            message: `无人机 ${drone.name} 离线`,
            timestamp: new Date().toISOString()
          })
        }
      })

      // 检查环境条件
      if (environment) {
        if (environment.windLevel >= 4) {
          alerts.push({
            id: 'alert-environment',
            type: 'warning',
            message: `风级过高（${environment.windLevel}级），不适合飞行`,
            timestamp: new Date().toISOString()
          })
        }
        
        if (environment.temperature < -10 || environment.temperature > 40) {
          alerts.push({
            id: 'alert-temperature',
            type: 'warning',
            message: `温度异常（${environment.temperature}°C），不适合飞行`,
            timestamp: new Date().toISOString()
          })
        }
      }

      const dashboardData = {
        drones,
        environment,
        targets,
        users,
        chargingStations,
        activeOperations,
        alerts
      }

      return res.json(ResponseUtil.success(dashboardData, '获取仪表板数据成功'))

    } catch (error) {
      console.error('获取仪表板数据错误:', error)
      return res.status(500).json(ResponseUtil.internalError('获取仪表板数据失败'))
    }
  }

  // 获取实时数据
  static async getRealtimeData(req: Request, res: Response) {
    try {
      const [drones, environment] = await Promise.all([
        redisService.getAllDrones(),
        redisService.getLatestEnvironment()
      ])

      const realtimeData = {
        drones,
        environment,
        timestamp: new Date().toISOString()
      }

      return res.json(ResponseUtil.success(realtimeData, '获取实时数据成功'))

    } catch (error) {
      console.error('获取实时数据错误:', error)
      return res.status(500).json(ResponseUtil.internalError('获取实时数据失败'))
    }
  }

  // 获取统计数据
  static async getStatistics(req: Request, res: Response) {
    try {
      const [drones, operations, targets] = await Promise.all([
        redisService.getAllDrones(),
        redisService.getAllOperations(),
        redisService.getAllTargets()
      ])

      const statistics = {
        totalDrones: drones.length,
        onlineDrones: drones.filter(d => d.status === 'online').length,
        flyingDrones: drones.filter(d => d.status === 'flying').length,
        chargingDrones: drones.filter(d => d.status === 'charging').length,
        offlineDrones: drones.filter(d => d.status === 'offline').length,
        avgBattery: drones.length > 0 
          ? Math.round(drones.reduce((sum, d) => sum + d.battery, 0) / drones.length)
          : 0,
        totalOperations: operations.length,
        completedOperations: operations.filter(op => op.status === 'completed').length,
        pendingOperations: operations.filter(op => op.status === 'pending').length,
        totalTargets: targets.length,
        completedTargets: targets.filter(t => t.status === 'completed').length,
        inProgressTargets: targets.filter(t => t.status === 'in-progress').length
      }

      return res.json(ResponseUtil.success(statistics, '获取统计数据成功'))

    } catch (error) {
      console.error('获取统计数据错误:', error)
      return res.status(500).json(ResponseUtil.internalError('获取统计数据失败'))
    }
  }
}

export default DashboardController