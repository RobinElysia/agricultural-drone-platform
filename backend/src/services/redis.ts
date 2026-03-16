import redisManager from '../utils/redis'
import { 
  User, Drone, Environment, WorkTarget, ChargingStation, PathPlan, Operation, AIChat 
} from '../models'

// Redis键前缀
const KEYS = {
  USERS: 'users',
  DRONES: 'drones',
  ENVIRONMENTS: 'environments',
  TARGETS: 'targets',
  CHARGING_STATIONS: 'charging_stations',
  PATH_PLANS: 'path_plans',
  OPERATIONS: 'operations',
  AI_CHATS: 'ai_chats',
  REALTIME: 'realtime',
  SESSIONS: 'sessions'
}

// Redis服务层
export class RedisService {
  private redis = redisManager

  constructor() {
    // redis实例已经在导入时初始化
  }

  // 用户管理
  async saveUser(user: User): Promise<void> {
    const key = `${KEYS.USERS}:${user.id}`
    await this.redis.hSet(key, 'data', JSON.stringify(user))
    await this.redis.sAdd(KEYS.USERS, user.id)
  }

  async getUser(id: string): Promise<User | null> {
    const key = `${KEYS.USERS}:${id}`
    const data = await this.redis.hGet(key, 'data')
    return data ? JSON.parse(data) : null
  }

  async getAllUsers(): Promise<User[]> {
    const ids = await this.redis.sMembers(KEYS.USERS)
    const users: User[] = []
    for (const id of ids) {
      const user = await this.getUser(id)
      if (user) users.push(user)
    }
    return users
  }

  async deleteUser(id: string): Promise<void> {
    const key = `${KEYS.USERS}:${id}`
    await this.redis.hDel(key, 'data')
    await this.redis.sRem(KEYS.USERS, id)
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const users = await this.getAllUsers()
    return users.find(u => u.username === username) || null
  }

  // 无人机管理
  async saveDrone(drone: Drone): Promise<void> {
    const key = `${KEYS.DRONES}:${drone.id}`
    await this.redis.hSet(key, 'data', JSON.stringify(drone))
    await this.redis.sAdd(KEYS.DRONES, drone.id)
  }

  async getDrone(id: string): Promise<Drone | null> {
    const key = `${KEYS.DRONES}:${id}`
    const data = await this.redis.hGet(key, 'data')
    return data ? JSON.parse(data) : null
  }

  async getAllDrones(): Promise<Drone[]> {
    const ids = await this.redis.sMembers(KEYS.DRONES)
    const drones: Drone[] = []
    for (const id of ids) {
      const drone = await this.getDrone(id)
      if (drone) drones.push(drone)
    }
    return drones
  }

  async deleteDrone(id: string): Promise<void> {
    const key = `${KEYS.DRONES}:${id}`
    await this.redis.hDel(key, 'data')
    await this.redis.sRem(KEYS.DRONES, id)
  }

  // 环境信息管理
  async saveEnvironment(env: Environment): Promise<void> {
    const key = `${KEYS.ENVIRONMENTS}:${env.id}`
    await this.redis.hSet(key, 'data', JSON.stringify(env))
    await this.redis.sAdd(KEYS.ENVIRONMENTS, env.id)
    // 保留最近10条环境记录
    await this.redis.lPush('environment_history', JSON.stringify(env))
    await this.redis.lTrim('environment_history', 0, 9)
  }

  async getLatestEnvironment(): Promise<Environment | null> {
    const history = await this.redis.lRange('environment_history', 0, 0)
    if (history.length > 0) {
      return JSON.parse(history[0])
    }
    return null
  }

  // 作业目标管理
  async saveTarget(target: WorkTarget): Promise<void> {
    const key = `${KEYS.TARGETS}:${target.id}`
    await this.redis.hSet(key, 'data', JSON.stringify(target))
    await this.redis.sAdd(KEYS.TARGETS, target.id)
  }

  async getTarget(id: string): Promise<WorkTarget | null> {
    const key = `${KEYS.TARGETS}:${id}`
    const data = await this.redis.hGet(key, 'data')
    return data ? JSON.parse(data) : null
  }

  async getAllTargets(): Promise<WorkTarget[]> {
    const ids = await this.redis.sMembers(KEYS.TARGETS)
    console.log('Redis中的作业目标IDs:', ids)
    const targets: WorkTarget[] = []
    for (const id of ids) {
      const target = await this.getTarget(id)
      if (target) {
        console.log('获取到作业目标:', target.name)
        targets.push(target)
      }
    }
    console.log('总共获取到', targets.length, '个作业目标')
    return targets
  }

  async deleteTarget(id: string): Promise<void> {
    const key = `${KEYS.TARGETS}:${id}`
    await this.redis.hDel(key, 'data')
    await this.redis.sRem(KEYS.TARGETS, id)
  }

  // 换电站管理
  async saveChargingStation(station: ChargingStation): Promise<void> {
    const key = `${KEYS.CHARGING_STATIONS}:${station.id}`
    await this.redis.hSet(key, 'data', JSON.stringify(station))
    await this.redis.sAdd(KEYS.CHARGING_STATIONS, station.id)
  }

  async getChargingStation(id: string): Promise<ChargingStation | null> {
    const key = `${KEYS.CHARGING_STATIONS}:${id}`
    const data = await this.redis.hGet(key, 'data')
    return data ? JSON.parse(data) : null
  }

  async getAllChargingStations(): Promise<ChargingStation[]> {
    const ids = await this.redis.sMembers(KEYS.CHARGING_STATIONS)
    const stations: ChargingStation[] = []
    for (const id of ids) {
      const station = await this.getChargingStation(id)
      if (station) stations.push(station)
    }
    return stations
  }

  async deleteChargingStation(id: string): Promise<void> {
    const key = `${KEYS.CHARGING_STATIONS}:${id}`
    await this.redis.hDel(key, 'data')
    await this.redis.sRem(KEYS.CHARGING_STATIONS, id)
  }

  // 路径规划管理
  async savePathPlan(pathPlan: PathPlan): Promise<void> {
    const key = `${KEYS.PATH_PLANS}:${pathPlan.id}`
    await this.redis.hSet(key, 'data', JSON.stringify(pathPlan))
    await this.redis.sAdd(KEYS.PATH_PLANS, pathPlan.id)
  }

  async getPathPlan(id: string): Promise<PathPlan | null> {
    const key = `${KEYS.PATH_PLANS}:${id}`
    const data = await this.redis.hGet(key, 'data')
    return data ? JSON.parse(data) : null
  }

  async getAllPathPlans(): Promise<PathPlan[]> {
    const ids = await this.redis.sMembers(KEYS.PATH_PLANS)
    const plans: PathPlan[] = []
    for (const id of ids) {
      const plan = await this.getPathPlan(id)
      if (plan) plans.push(plan)
    }
    return plans
  }

  // 操作记录管理
  async saveOperation(operation: Operation): Promise<void> {
    const key = `${KEYS.OPERATIONS}:${operation.id}`
    await this.redis.hSet(key, 'data', JSON.stringify(operation))
    await this.redis.sAdd(KEYS.OPERATIONS, operation.id)
    // 保留最近50条操作记录
    await this.redis.lPush('operation_history', JSON.stringify(operation))
    await this.redis.lTrim('operation_history', 0, 49)
  }

  async getOperation(id: string): Promise<Operation | null> {
    const key = `${KEYS.OPERATIONS}:${id}`
    const data = await this.redis.hGet(key, 'data')
    return data ? JSON.parse(data) : null
  }

  async getAllOperations(): Promise<Operation[]> {
    const ids = await this.redis.sMembers(KEYS.OPERATIONS)
    const operations: Operation[] = []
    for (const id of ids) {
      const operation = await this.getOperation(id)
      if (operation) operations.push(operation)
    }
    return operations
  }

  // AI对话管理
  async saveAIChat(chat: AIChat): Promise<void> {
    const key = `${KEYS.AI_CHATS}:${chat.id}`
    await this.redis.hSet(key, 'data', JSON.stringify(chat))
    await this.redis.sAdd(KEYS.AI_CHATS, chat.id)
    // 保留最近100条对话记录
    await this.redis.lPush(`ai_chats:${chat.userId}`, JSON.stringify(chat))
    await this.redis.lTrim(`ai_chats:${chat.userId}`, 0, 99)
  }

  async getAIChat(id: string): Promise<AIChat | null> {
    const key = `${KEYS.AI_CHATS}:${id}`
    const data = await this.redis.hGet(key, 'data')
    return data ? JSON.parse(data) : null
  }

  async getAIChatHistory(userId: string, limit: number = 50): Promise<AIChat[]> {
    const history = await this.redis.lRange(`ai_chats:${userId}`, 0, limit - 1)
    return history.map(item => JSON.parse(item))
  }

  async clearAIChatHistory(userId: string): Promise<void> {
    await this.redis.delete(`ai_chats:${userId}`)
  }

  // 实时数据推送
  async publishRealtimeData(data: any): Promise<void> {
    await this.redis.publish('realtime', JSON.stringify(data))
  }

  // 会话管理
  async saveSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    const key = `${KEYS.SESSIONS}:${sessionId}`
    await this.redis.set(key, JSON.stringify(data), ttl)
  }

  async getSession(sessionId: string): Promise<any | null> {
    const key = `${KEYS.SESSIONS}:${sessionId}`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data) : null
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `${KEYS.SESSIONS}:${sessionId}`
    await this.redis.delete(key)
  }

  // 清理所有数据（用于测试）
  async clearAll(): Promise<void> {
    const keys = await this.redis.keys('*')
    for (const key of keys) {
      await this.redis.delete(key)
    }
  }

  // 检查连接
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch (error) {
      return false
    }
  }
}

// 默认导出
export default new RedisService()