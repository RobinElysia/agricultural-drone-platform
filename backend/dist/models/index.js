// 数据模型定义
import { v4 as uuidv4 } from 'uuid';
// 工厂函数
export class ModelFactory {
    static createUser(data) {
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
        };
    }
    static createDrone(data) {
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
        };
    }
    static createEnvironment(data) {
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
        };
    }
    static createWorkTarget(data) {
        return {
            id: uuidv4(),
            name: data.name || '未命名目标',
            area: data.area ?? 0,
            pesticide: data.pesticide ?? 0,
            status: data.status || 'pending',
            location: data.location || { lat: 39.9, lng: 116.4 },
            createdBy: data.createdBy,
            createdAt: new Date().toISOString()
        };
    }
    static createChargingStation(data) {
        return {
            id: uuidv4(),
            name: data.name || '未命名换电站',
            location: data.location || { lat: 39.9, lng: 116.4 },
            status: data.status || 'available',
            capacity: data.capacity ?? 5,
            currentOccupancy: data.currentOccupancy ?? 0
        };
    }
    static createPathPlan(data) {
        return {
            id: uuidv4(),
            droneId: data.droneId || '',
            targetId: data.targetId || '',
            waypoints: data.waypoints || [],
            estimatedTime: data.estimatedTime ?? 0,
            distance: data.distance ?? 0,
            status: data.status || 'planned',
            createdAt: new Date().toISOString()
        };
    }
    static createOperation(data) {
        return {
            id: uuidv4(),
            droneId: data.droneId || '',
            type: data.type || 'takeoff',
            parameters: data.parameters,
            status: data.status || 'pending',
            createdBy: data.createdBy || '',
            createdAt: new Date().toISOString()
        };
    }
    static createAIChat(data) {
        return {
            id: uuidv4(),
            userId: data.userId || '',
            question: data.question || '',
            answer: data.answer || '',
            context: data.context,
            timestamp: new Date().toISOString()
        };
    }
}
