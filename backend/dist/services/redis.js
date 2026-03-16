import redisManager from '../utils/redis';
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
};
// Redis服务层
export class RedisService {
    redis = redisManager;
    constructor() {
        // redis实例已经在导入时初始化
    }
    // 用户管理
    async saveUser(user) {
        const key = `${KEYS.USERS}:${user.id}`;
        await this.redis.hSet(key, 'data', JSON.stringify(user));
        await this.redis.sAdd(KEYS.USERS, user.id);
    }
    async getUser(id) {
        const key = `${KEYS.USERS}:${id}`;
        const data = await this.redis.hGet(key, 'data');
        return data ? JSON.parse(data) : null;
    }
    async getAllUsers() {
        const ids = await this.redis.sMembers(KEYS.USERS);
        const users = [];
        for (const id of ids) {
            const user = await this.getUser(id);
            if (user)
                users.push(user);
        }
        return users;
    }
    async deleteUser(id) {
        const key = `${KEYS.USERS}:${id}`;
        await this.redis.hDel(key, 'data');
        await this.redis.sRem(KEYS.USERS, id);
    }
    async getUserByUsername(username) {
        const users = await this.getAllUsers();
        return users.find(u => u.username === username) || null;
    }
    // 无人机管理
    async saveDrone(drone) {
        const key = `${KEYS.DRONES}:${drone.id}`;
        await this.redis.hSet(key, 'data', JSON.stringify(drone));
        await this.redis.sAdd(KEYS.DRONES, drone.id);
    }
    async getDrone(id) {
        const key = `${KEYS.DRONES}:${id}`;
        const data = await this.redis.hGet(key, 'data');
        return data ? JSON.parse(data) : null;
    }
    async getAllDrones() {
        const ids = await this.redis.sMembers(KEYS.DRONES);
        const drones = [];
        for (const id of ids) {
            const drone = await this.getDrone(id);
            if (drone)
                drones.push(drone);
        }
        return drones;
    }
    async deleteDrone(id) {
        const key = `${KEYS.DRONES}:${id}`;
        await this.redis.hDel(key, 'data');
        await this.redis.sRem(KEYS.DRONES, id);
    }
    // 环境信息管理
    async saveEnvironment(env) {
        const key = `${KEYS.ENVIRONMENTS}:${env.id}`;
        await this.redis.hSet(key, 'data', JSON.stringify(env));
        await this.redis.sAdd(KEYS.ENVIRONMENTS, env.id);
        // 保留最近10条环境记录
        await this.redis.lPush('environment_history', JSON.stringify(env));
        await this.redis.lTrim('environment_history', 0, 9);
    }
    async getLatestEnvironment() {
        const history = await this.redis.lRange('environment_history', 0, 0);
        if (history.length > 0) {
            return JSON.parse(history[0]);
        }
        return null;
    }
    // 作业目标管理
    async saveTarget(target) {
        const key = `${KEYS.TARGETS}:${target.id}`;
        await this.redis.hSet(key, 'data', JSON.stringify(target));
        await this.redis.sAdd(KEYS.TARGETS, target.id);
    }
    async getTarget(id) {
        const key = `${KEYS.TARGETS}:${id}`;
        const data = await this.redis.hGet(key, 'data');
        return data ? JSON.parse(data) : null;
    }
    async getAllTargets() {
        const ids = await this.redis.sMembers(KEYS.TARGETS);
        console.log('Redis中的作业目标IDs:', ids);
        const targets = [];
        for (const id of ids) {
            const target = await this.getTarget(id);
            if (target) {
                console.log('获取到作业目标:', target.name);
                targets.push(target);
            }
        }
        console.log('总共获取到', targets.length, '个作业目标');
        return targets;
    }
    async deleteTarget(id) {
        const key = `${KEYS.TARGETS}:${id}`;
        await this.redis.hDel(key, 'data');
        await this.redis.sRem(KEYS.TARGETS, id);
    }
    // 换电站管理
    async saveChargingStation(station) {
        const key = `${KEYS.CHARGING_STATIONS}:${station.id}`;
        await this.redis.hSet(key, 'data', JSON.stringify(station));
        await this.redis.sAdd(KEYS.CHARGING_STATIONS, station.id);
    }
    async getChargingStation(id) {
        const key = `${KEYS.CHARGING_STATIONS}:${id}`;
        const data = await this.redis.hGet(key, 'data');
        return data ? JSON.parse(data) : null;
    }
    async getAllChargingStations() {
        const ids = await this.redis.sMembers(KEYS.CHARGING_STATIONS);
        const stations = [];
        for (const id of ids) {
            const station = await this.getChargingStation(id);
            if (station)
                stations.push(station);
        }
        return stations;
    }
    async deleteChargingStation(id) {
        const key = `${KEYS.CHARGING_STATIONS}:${id}`;
        await this.redis.hDel(key, 'data');
        await this.redis.sRem(KEYS.CHARGING_STATIONS, id);
    }
    // 路径规划管理
    async savePathPlan(pathPlan) {
        const key = `${KEYS.PATH_PLANS}:${pathPlan.id}`;
        await this.redis.hSet(key, 'data', JSON.stringify(pathPlan));
        await this.redis.sAdd(KEYS.PATH_PLANS, pathPlan.id);
    }
    async getPathPlan(id) {
        const key = `${KEYS.PATH_PLANS}:${id}`;
        const data = await this.redis.hGet(key, 'data');
        return data ? JSON.parse(data) : null;
    }
    async getAllPathPlans() {
        const ids = await this.redis.sMembers(KEYS.PATH_PLANS);
        const plans = [];
        for (const id of ids) {
            const plan = await this.getPathPlan(id);
            if (plan)
                plans.push(plan);
        }
        return plans;
    }
    // 操作记录管理
    async saveOperation(operation) {
        const key = `${KEYS.OPERATIONS}:${operation.id}`;
        await this.redis.hSet(key, 'data', JSON.stringify(operation));
        await this.redis.sAdd(KEYS.OPERATIONS, operation.id);
        // 保留最近50条操作记录
        await this.redis.lPush('operation_history', JSON.stringify(operation));
        await this.redis.lTrim('operation_history', 0, 49);
    }
    async getOperation(id) {
        const key = `${KEYS.OPERATIONS}:${id}`;
        const data = await this.redis.hGet(key, 'data');
        return data ? JSON.parse(data) : null;
    }
    async getAllOperations() {
        const ids = await this.redis.sMembers(KEYS.OPERATIONS);
        const operations = [];
        for (const id of ids) {
            const operation = await this.getOperation(id);
            if (operation)
                operations.push(operation);
        }
        return operations;
    }
    // AI对话管理
    async saveAIChat(chat) {
        const key = `${KEYS.AI_CHATS}:${chat.id}`;
        await this.redis.hSet(key, 'data', JSON.stringify(chat));
        await this.redis.sAdd(KEYS.AI_CHATS, chat.id);
        // 保留最近100条对话记录
        await this.redis.lPush(`ai_chats:${chat.userId}`, JSON.stringify(chat));
        await this.redis.lTrim(`ai_chats:${chat.userId}`, 0, 99);
    }
    async getAIChat(id) {
        const key = `${KEYS.AI_CHATS}:${id}`;
        const data = await this.redis.hGet(key, 'data');
        return data ? JSON.parse(data) : null;
    }
    async getAIChatHistory(userId, limit = 50) {
        const history = await this.redis.lRange(`ai_chats:${userId}`, 0, limit - 1);
        return history.map(item => JSON.parse(item));
    }
    async clearAIChatHistory(userId) {
        await this.redis.delete(`ai_chats:${userId}`);
    }
    // 实时数据推送
    async publishRealtimeData(data) {
        await this.redis.publish('realtime', JSON.stringify(data));
    }
    // 会话管理
    async saveSession(sessionId, data, ttl = 3600) {
        const key = `${KEYS.SESSIONS}:${sessionId}`;
        await this.redis.set(key, JSON.stringify(data), ttl);
    }
    async getSession(sessionId) {
        const key = `${KEYS.SESSIONS}:${sessionId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    async deleteSession(sessionId) {
        const key = `${KEYS.SESSIONS}:${sessionId}`;
        await this.redis.delete(key);
    }
    // 清理所有数据（用于测试）
    async clearAll() {
        const keys = await this.redis.keys('*');
        for (const key of keys) {
            await this.redis.delete(key);
        }
    }
    // 检查连接
    async healthCheck() {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        }
        catch (error) {
            return false;
        }
    }
}
// 默认导出
export default new RedisService();
