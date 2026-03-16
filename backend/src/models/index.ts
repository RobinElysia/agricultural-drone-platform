// 数据模型定义
import { v4 as uuidv4 } from 'uuid'

// 用户模型
export interface User {
  id: string
  username: string
  password: string
  name: string
  role: 'admin' | 'operator' | 'agriculturalist'
  email?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

// 无人机模型
export interface Drone {
  id: string
  name: string
  battery: number
  motorSpeed: number
  load: number
  status: 'online' | 'offline' | 'charging' | 'flying'
  position: {
    lat: number
    lng: number
  }
  lastUpdate: string
  createdBy?: string
}

// 环境信息模型
export interface Environment {
  id: string
  temperature: number
  weather: string
  windLevel: number
  humidity: number
  windDirection?: string
  reportTime?: string
  location: {
    lat: number
    lng: number
  }
  timestamp: string
}

// 作业目标模型
export interface WorkTarget {
  id: string
  name: string
  area: number
  pesticide: number
  status: 'pending' | 'in-progress' | 'completed'
  location: {
    lat: number
    lng: number
  }
  createdBy?: string
  createdAt: string
}

// 换电站模型
export interface ChargingStation {
  id: string
  name: string
  location: {
    lat: number
    lng: number
  }
  status: 'available' | 'occupied' | 'maintenance'
  capacity: number
  currentOccupancy: number
}

// 路径规划模型
export interface PathPlan {
  id: string
  droneId: string
  targetId: string
  waypoints: Array<{
    lat: number
    lng: number
    order: number
  }>
  estimatedTime: number
  distance: number
  status: 'planned' | 'in-progress' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
}

// 操作记录模型
export interface Operation {
  id: string
  droneId: string
  type: 'takeoff' | 'land' | 'spray' | 'charge' | 'return'
  parameters?: Record<string, any>
  status: 'pending' | 'executing' | 'completed' | 'failed'
  createdBy: string
  createdAt: string
  completedAt?: string
  result?: any
}

// AI对话模型
export interface AIChat {
  id: string
  userId: string
  question: string
  answer: string
  context?: string
  timestamp: string
}

// 实时数据推送模型
export interface RealtimeData {
  type: 'drone_status' | 'environment' | 'operation' | 'alert'
  data: any
  timestamp: string
}

// 工厂函数
export class ModelFactory {
  static createUser(data: Partial<User>): User {
    return {
      id: uuidv4(),
      username: data.username || '',
      password: data.password || '',
      name: data.name || '',
      role: data.role || 'agriculturalist',
      email: data.email,
      phone: data.phone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  static createDrone(data: Partial<Drone>): Drone {
    return {
      id: uuidv4(),
      name: data.name || '未命名无人机',
      battery: data.battery ?? 100,
      motorSpeed: data.motorSpeed ?? 0,
      load: data.load ?? 0,
      status: data.status || 'online',
      position: data.position || { lat: 39.9, lng: 116.4 },
      lastUpdate: new Date().toISOString(),
      createdBy: data.createdBy
    }
  }

  static createEnvironment(data: Partial<Environment>): Environment {
    return {
      id: uuidv4(),
      temperature: data.temperature ?? 25,
      weather: data.weather || '晴',
      windLevel: data.windLevel ?? 2,
      humidity: data.humidity ?? 50,
      windDirection: data.windDirection,
      reportTime: data.reportTime,
      location: data.location || { lat: 39.9, lng: 116.4 },
      timestamp: new Date().toISOString()
    }
  }

  static createWorkTarget(data: Partial<WorkTarget>): WorkTarget {
    return {
      id: uuidv4(),
      name: data.name || '未命名目标',
      area: data.area ?? 0,
      pesticide: data.pesticide ?? 0,
      status: data.status || 'pending',
      location: data.location || { lat: 39.9, lng: 116.4 },
      createdBy: data.createdBy,
      createdAt: new Date().toISOString()
    }
  }

  static createChargingStation(data: Partial<ChargingStation>): ChargingStation {
    return {
      id: uuidv4(),
      name: data.name || '未命名换电站',
      location: data.location || { lat: 39.9, lng: 116.4 },
      status: data.status || 'available',
      capacity: data.capacity ?? 5,
      currentOccupancy: data.currentOccupancy ?? 0
    }
  }

  static createPathPlan(data: Partial<PathPlan>): PathPlan {
    return {
      id: uuidv4(),
      droneId: data.droneId || '',
      targetId: data.targetId || '',
      waypoints: data.waypoints || [],
      estimatedTime: data.estimatedTime ?? 0,
      distance: data.distance ?? 0,
      status: data.status || 'planned',
      createdAt: new Date().toISOString()
    }
  }

  static createOperation(data: Partial<Operation>): Operation {
    return {
      id: uuidv4(),
      droneId: data.droneId || '',
      type: data.type || 'takeoff',
      parameters: data.parameters,
      status: data.status || 'pending',
      createdBy: data.createdBy || '',
      createdAt: new Date().toISOString()
    }
  }

  static createAIChat(data: Partial<AIChat>): AIChat {
    return {
      id: uuidv4(),
      userId: data.userId || '',
      question: data.question || '',
      answer: data.answer || '',
      context: data.context,
      timestamp: new Date().toISOString()
    }
  }
}