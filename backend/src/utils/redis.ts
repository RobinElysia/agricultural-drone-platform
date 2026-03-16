import { createClient, RedisClientType } from 'redis'
import { config } from '../config'

let redisClient: RedisClientType | null = null

// Redis连接管理
export class RedisManager {
  private static instance: RedisManager
  private client: RedisClientType | null = null

  private constructor() {}

  static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager()
    }
    return RedisManager.instance
  }

  async connect(): Promise<RedisClientType> {
    if (this.client && this.client.isOpen) {
      return this.client
    }

    try {
      const client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port
        },
        password: config.redis.password || undefined,
        database: config.redis.db
      })

      await client.connect()
      this.client = client
      redisClient = client
      
      console.log('Redis connected successfully')
      return client
    } catch (error) {
      console.error('Redis connection failed:', error)
      throw error
    }
  }

  getClient(): RedisClientType {
    if (!this.client || !this.client.isOpen) {
      throw new Error('Redis client not connected')
    }
    return this.client
  }

  async disconnect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.quit()
      this.client = null
      redisClient = null
    }
  }

  // 通用键值操作
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = this.getClient()
    await client.set(key, value)
    if (ttl) {
      await client.expire(key, ttl)
    }
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient()
    return await client.get(key)
  }

  async delete(key: string): Promise<void> {
    const client = this.getClient()
    await client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const client = this.getClient()
    const result = await client.exists(key)
    return result > 0
  }

  // 哈希操作
  async hSet(key: string, field: string, value: string): Promise<void> {
    const client = this.getClient()
    await client.hSet(key, field, value)
  }

  async hGet(key: string, field: string): Promise<string | null> {
    const client = this.getClient()
    return await client.hGet(key, field)
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    const client = this.getClient()
    return await client.hGetAll(key)
  }

  async hDel(key: string, field: string): Promise<void> {
    const client = this.getClient()
    await client.hDel(key, field)
  }

  // 列表操作
  async lPush(key: string, value: string): Promise<void> {
    const client = this.getClient()
    await client.lPush(key, value)
  }

  async rPush(key: string, value: string): Promise<void> {
    const client = this.getClient()
    await client.rPush(key, value)
  }

  async lRange(key: string, start: number, end: number): Promise<string[]> {
    const client = this.getClient()
    return await client.lRange(key, start, end)
  }

  async lLen(key: string): Promise<number> {
    const client = this.getClient()
    return await client.lLen(key)
  }

  async lTrim(key: string, start: number, stop: number): Promise<void> {
    const client = this.getClient()
    await client.lTrim(key, start, stop)
  }

  // 集合操作
  async sAdd(key: string, member: string): Promise<void> {
    const client = this.getClient()
    await client.sAdd(key, member)
  }

  async sMembers(key: string): Promise<string[]> {
    const client = this.getClient()
    return await client.sMembers(key)
  }

  async sRem(key: string, member: string): Promise<void> {
    const client = this.getClient()
    await client.sRem(key, member)
  }

  // 发布订阅
  async publish(channel: string, message: string): Promise<void> {
    const client = this.getClient()
    await client.publish(channel, message)
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const client = this.getClient()
    await client.subscribe(channel, callback)
  }

  // 键模式匹配
  async keys(pattern: string): Promise<string[]> {
    const client = this.getClient()
    return await client.keys(pattern)
  }

  // 设置过期时间
  async expire(key: string, seconds: number): Promise<void> {
    const client = this.getClient()
    await client.expire(key, seconds)
  }

  // 检查连接
  async ping(): Promise<string> {
    const client = this.getClient()
    return await client.ping()
  }
}

// 默认导出
export default RedisManager.getInstance()