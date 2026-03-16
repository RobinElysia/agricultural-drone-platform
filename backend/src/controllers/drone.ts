import { Request, Response } from 'express'
import { ResponseUtil } from '../utils/response'
import redisService from '../services/redis'
import { ModelFactory } from '../models'

// 无人机控制器
export class DroneController {
  // 获取所有无人机
  static async getDrones(req: Request, res: Response) {
    try {
      const drones = await redisService.getAllDrones()
      return res.json(ResponseUtil.success(drones, '获取无人机列表成功'))
    } catch (error) {
      console.error('获取无人机列表错误:', error)
      return res.status(500).json(ResponseUtil.internalError('获取无人机列表失败'))
    }
  }

  // 获取单个无人机
  static async getDrone(req: Request, res: Response) {
    try {
      const { id } = req.params
      
      if (!id) {
        return res.status(400).json(ResponseUtil.badRequest('缺少无人机ID'))
      }

      const drone = await redisService.getDrone(id)
      
      if (!drone) {
        return res.status(404).json(ResponseUtil.notFound('无人机不存在'))
      }

      return res.json(ResponseUtil.success(drone, '获取无人机信息成功'))

    } catch (error) {
      console.error('获取无人机错误:', error)
      return res.status(500).json(ResponseUtil.internalError('获取无人机失败'))
    }
  }

  // 创建无人机
  static async createDrone(req: Request, res: Response) {
    try {
      const { name, battery, motorSpeed, load, status, position } = req.body

      // 验证输入
      if (!name) {
        return res.status(400).json(ResponseUtil.badRequest('缺少无人机名称'))
      }

      // 创建无人机
      const drone = ModelFactory.createDrone({
        name,
        battery: battery ?? 100,
        motorSpeed: motorSpeed ?? 0,
        load: load ?? 0,
        status: status || 'online',
        position: position || { lat: 39.9, lng: 116.4 },
        createdBy: req.user?.id
      })

      // 保存到Redis
      await redisService.saveDrone(drone)

      // 发布实时数据
      await redisService.publishRealtimeData({
        type: 'drone_status',
        data: drone,
        timestamp: new Date().toISOString()
      })

      return res.json(ResponseUtil.success(drone, '创建无人机成功'))

    } catch (error) {
      console.error('创建无人机错误:', error)
      return res.status(500).json(ResponseUtil.internalError('创建无人机失败'))
    }
  }

  // 更新无人机
  static async updateDrone(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, battery, motorSpeed, load, status, position } = req.body

      if (!id) {
        return res.status(400).json(ResponseUtil.badRequest('缺少无人机ID'))
      }

      // 获取现有无人机
      const existingDrone = await redisService.getDrone(id)
      
      if (!existingDrone) {
        return res.status(404).json(ResponseUtil.notFound('无人机不存在'))
      }

      // 更新无人机信息
      const updatedDrone = {
        ...existingDrone,
        name: name || existingDrone.name,
        battery: battery ?? existingDrone.battery,
        motorSpeed: motorSpeed ?? existingDrone.motorSpeed,
        load: load ?? existingDrone.load,
        status: status || existingDrone.status,
        position: position || existingDrone.position,
        lastUpdate: new Date().toISOString()
      }

      // 保存到Redis
      await redisService.saveDrone(updatedDrone)

      // 发布实时数据
      await redisService.publishRealtimeData({
        type: 'drone_status',
        data: updatedDrone,
        timestamp: new Date().toISOString()
      })

      return res.json(ResponseUtil.success(updatedDrone, '更新无人机成功'))

    } catch (error) {
      console.error('更新无人机错误:', error)
      return res.status(500).json(ResponseUtil.internalError('更新无人机失败'))
    }
  }

  // 删除无人机
  static async deleteDrone(req: Request, res: Response) {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json(ResponseUtil.badRequest('缺少无人机ID'))
      }

      // 检查无人机是否存在
      const drone = await redisService.getDrone(id)
      
      if (!drone) {
        return res.status(404).json(ResponseUtil.notFound('无人机不存在'))
      }

      // 删除无人机
      await redisService.deleteDrone(id)

      return res.json(ResponseUtil.success(null, '删除无人机成功'))

    } catch (error) {
      console.error('删除无人机错误:', error)
      return res.status(500).json(ResponseUtil.internalError('删除无人机失败'))
    }
  }

  // 控制无人机
  static async controlDrone(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { operation, params } = req.body

      if (!id) {
        return res.status(400).json(ResponseUtil.badRequest('缺少无人机ID'))
      }

      if (!operation) {
        return res.status(400).json(ResponseUtil.badRequest('缺少操作类型'))
      }

      // 获取无人机
      const drone = await redisService.getDrone(id)
      
      if (!drone) {
        return res.status(404).json(ResponseUtil.notFound('无人机不存在'))
      }

      // 验证操作
      const validOperations = ['takeoff', 'land', 'spray', 'charge', 'return']
      if (!validOperations.includes(operation)) {
        return res.status(400).json(ResponseUtil.badRequest('无效的操作类型'))
      }

      // 创建操作记录
      const operationRecord = ModelFactory.createOperation({
        droneId: id,
        type: operation as any,
        parameters: params,
        createdBy: req.user?.id || 'system'
      })

      // 保存操作记录
      await redisService.saveOperation(operationRecord)

      // 模拟执行操作
      let updatedDrone = { ...drone }
      
      switch (operation) {
        case 'takeoff':
          updatedDrone.status = 'flying'
          updatedDrone.motorSpeed = 2500
          break
        case 'land':
          updatedDrone.status = 'online'
          updatedDrone.motorSpeed = 0
          break
        case 'spray':
          // 模拟喷洒操作
          if (drone.load > 0) {
            updatedDrone.load = Math.max(0, drone.load - (params?.amount || 5))
          }
          break
        case 'charge':
          updatedDrone.status = 'charging'
          // 模拟充电过程
          setTimeout(async () => {
            updatedDrone.status = 'online'
            updatedDrone.battery = 100
            await redisService.saveDrone(updatedDrone)
            await redisService.publishRealtimeData({
              type: 'drone_status',
              data: updatedDrone,
              timestamp: new Date().toISOString()
            })
          }, 5000)
          break
        case 'return':
          updatedDrone.status = 'flying'
          break
      }

      // 更新无人机状态
      await redisService.saveDrone(updatedDrone)

      // 发布实时数据
      await redisService.publishRealtimeData({
        type: 'operation',
        data: operationRecord,
        timestamp: new Date().toISOString()
      })

      return res.json(ResponseUtil.success(operationRecord, '操作已发送'))

    } catch (error) {
      console.error('控制无人机错误:', error)
      return res.status(500).json(ResponseUtil.internalError('控制无人机失败'))
    }
  }

  // 获取操作历史
  static async getOperations(req: Request, res: Response) {
    try {
      const operations = await redisService.getAllOperations()
      return res.json(ResponseUtil.success(operations, '获取操作历史成功'))
    } catch (error) {
      console.error('获取操作历史错误:', error)
      return res.status(500).json(ResponseUtil.internalError('获取操作历史失败'))
    }
  }
}

export default DroneController