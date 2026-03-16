import { createClient } from 'redis';
import { config } from '../config';
let redisClient = null;
// Redis连接管理
export class RedisManager {
    static instance;
    client = null;
    constructor() { }
    static getInstance() {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }
    async connect() {
        if (this.client && this.client.isOpen) {
            return this.client;
        }
        try {
            const client = createClient({
                socket: {
                    host: config.redis.host,
                    port: config.redis.port
                },
                password: config.redis.password || undefined,
                database: config.redis.db
            });
            await client.connect();
            this.client = client;
            redisClient = client;
            console.log('Redis connected successfully');
            return client;
        }
        catch (error) {
            console.error('Redis connection failed:', error);
            throw error;
        }
    }
    getClient() {
        if (!this.client || !this.client.isOpen) {
            throw new Error('Redis client not connected');
        }
        return this.client;
    }
    async disconnect() {
        if (this.client && this.client.isOpen) {
            await this.client.quit();
            this.client = null;
            redisClient = null;
        }
    }
    // 通用键值操作
    async set(key, value, ttl) {
        const client = this.getClient();
        await client.set(key, value);
        if (ttl) {
            await client.expire(key, ttl);
        }
    }
    async get(key) {
        const client = this.getClient();
        return await client.get(key);
    }
    async delete(key) {
        const client = this.getClient();
        await client.del(key);
    }
    async exists(key) {
        const client = this.getClient();
        const result = await client.exists(key);
        return result > 0;
    }
    // 哈希操作
    async hSet(key, field, value) {
        const client = this.getClient();
        await client.hSet(key, field, value);
    }
    async hGet(key, field) {
        const client = this.getClient();
        return await client.hGet(key, field);
    }
    async hGetAll(key) {
        const client = this.getClient();
        return await client.hGetAll(key);
    }
    async hDel(key, field) {
        const client = this.getClient();
        await client.hDel(key, field);
    }
    // 列表操作
    async lPush(key, value) {
        const client = this.getClient();
        await client.lPush(key, value);
    }
    async rPush(key, value) {
        const client = this.getClient();
        await client.rPush(key, value);
    }
    async lRange(key, start, end) {
        const client = this.getClient();
        return await client.lRange(key, start, end);
    }
    async lLen(key) {
        const client = this.getClient();
        return await client.lLen(key);
    }
    async lTrim(key, start, stop) {
        const client = this.getClient();
        await client.lTrim(key, start, stop);
    }
    // 集合操作
    async sAdd(key, member) {
        const client = this.getClient();
        await client.sAdd(key, member);
    }
    async sMembers(key) {
        const client = this.getClient();
        return await client.sMembers(key);
    }
    async sRem(key, member) {
        const client = this.getClient();
        await client.sRem(key, member);
    }
    // 发布订阅
    async publish(channel, message) {
        const client = this.getClient();
        await client.publish(channel, message);
    }
    async subscribe(channel, callback) {
        const client = this.getClient();
        await client.subscribe(channel, callback);
    }
    // 键模式匹配
    async keys(pattern) {
        const client = this.getClient();
        return await client.keys(pattern);
    }
    // 设置过期时间
    async expire(key, seconds) {
        const client = this.getClient();
        await client.expire(key, seconds);
    }
    // 检查连接
    async ping() {
        const client = this.getClient();
        return await client.ping();
    }
}
// 默认导出
export default RedisManager.getInstance();
