// 初始化测试数据脚本
import 'dotenv/config';
import redisManager from '../utils/redis';
import redisService from '../services/redis';
import { ModelFactory } from '../models';
import { AuthUtil } from '../utils/auth';
async function initData() {
    console.log('开始初始化测试数据...');
    try {
        // 连接Redis
        await redisManager.connect();
        // 创建测试用户
        console.log('创建测试用户...');
        // 管理员
        const adminPassword = await AuthUtil.hashPassword('admin123');
        const adminUser = ModelFactory.createUser({
            username: 'admin',
            password: adminPassword,
            role: 'admin',
            name: '系统管理员',
            email: 'admin@agridrone.com',
            phone: '13800138000'
        });
        await redisService.saveUser(adminUser);
        console.log(`✓ 管理员用户创建成功：${adminUser.username} / admin123`);
        // 操作员
        const operatorPassword = await AuthUtil.hashPassword('operator123');
        const operatorUser = ModelFactory.createUser({
            username: 'operator',
            password: operatorPassword,
            role: 'operator',
            name: '操作员',
            email: 'operator@agridrone.com',
            phone: '13800138001'
        });
        await redisService.saveUser(operatorUser);
        console.log(`✓ 操作员用户创建成功：${operatorUser.username} / operator123`);
        // 农业员
        const farmerPassword = await AuthUtil.hashPassword('farmer123');
        const farmerUser = ModelFactory.createUser({
            username: 'farmer',
            password: farmerPassword,
            role: 'agriculturalist',
            name: '农业员',
            email: 'farmer@agridrone.com',
            phone: '13800138002'
        });
        await redisService.saveUser(farmerUser);
        console.log(`✓ 农业员用户创建成功：${farmerUser.username} / farmer123`);
        // 创建测试无人机
        console.log('创建测试无人机...');
        const drone1 = ModelFactory.createDrone({
            name: '无人机-001',
            battery: 85,
            motorSpeed: 2500,
            load: 20,
            status: 'online',
            position: { lat: 39.90923, lng: 116.397428 }
        });
        await redisService.saveDrone(drone1);
        console.log(`✓ 无人机-001 创建成功`);
        const drone2 = ModelFactory.createDrone({
            name: '无人机-002',
            battery: 45,
            motorSpeed: 1800,
            load: 15,
            status: 'flying',
            position: { lat: 39.91023, lng: 116.398428 }
        });
        await redisService.saveDrone(drone2);
        console.log(`✓ 无人机-002 创建成功`);
        const drone3 = ModelFactory.createDrone({
            name: '无人机-003',
            battery: 15,
            motorSpeed: 0,
            load: 10,
            status: 'charging',
            position: { lat: 39.90823, lng: 116.396428 }
        });
        await redisService.saveDrone(drone3);
        console.log(`✓ 无人机-003 创建成功`);
        // 创建环境数据
        console.log('创建环境数据...');
        const environment = ModelFactory.createEnvironment({
            temperature: 25,
            weather: '晴',
            windLevel: 2,
            humidity: 55,
            location: { lat: 39.90923, lng: 116.397428 }
        });
        await redisService.saveEnvironment(environment);
        console.log(`✓ 环境数据创建成功`);
        // 创建作业目标
        console.log('创建作业目标...');
        const target1 = ModelFactory.createWorkTarget({
            name: 'A区麦田',
            area: 50,
            pesticide: 100,
            status: 'pending',
            location: { lat: 39.90923, lng: 116.397428 }
        });
        await redisService.saveTarget(target1);
        console.log(`✓ 作业目标-001 创建成功`);
        const target2 = ModelFactory.createWorkTarget({
            name: 'B区稻田',
            area: 30,
            pesticide: 60,
            status: 'in-progress',
            location: { lat: 39.91023, lng: 116.398428 }
        });
        await redisService.saveTarget(target2);
        console.log(`✓ 作业目标-002 创建成功`);
        // 创建换电站
        console.log('创建换电站...');
        const station1 = ModelFactory.createChargingStation({
            name: '换电站-001',
            location: { lat: 39.90523, lng: 116.395428 },
            status: 'available',
            capacity: 5,
            currentOccupancy: 2
        });
        await redisService.saveChargingStation(station1);
        console.log(`✓ 换电站-001 创建成功`);
        const station2 = ModelFactory.createChargingStation({
            name: '换电站-002',
            location: { lat: 39.91523, lng: 116.405428 },
            status: 'occupied',
            capacity: 5,
            currentOccupancy: 5
        });
        await redisService.saveChargingStation(station2);
        console.log(`✓ 换电站-002 创建成功`);
        // 创建操作记录
        console.log('创建操作记录...');
        const operation1 = ModelFactory.createOperation({
            droneId: drone2.id,
            type: 'takeoff',
            status: 'completed',
            createdBy: adminUser.id
        });
        await redisService.saveOperation(operation1);
        console.log(`✓ 操作记录-001 创建成功`);
        const operation2 = ModelFactory.createOperation({
            droneId: drone2.id,
            type: 'spray',
            status: 'executing',
            createdBy: operatorUser.id,
            parameters: { amount: 5 }
        });
        await redisService.saveOperation(operation2);
        console.log(`✓ 操作记录-002 创建成功`);
        console.log('\n✅ 测试数据初始化完成！');
        console.log('\n登录信息：');
        console.log('管理员：admin / admin123');
        console.log('操作员：operator / operator123');
        console.log('农业员：farmer / farmer123');
        // 断开连接
        await redisManager.disconnect();
    }
    catch (error) {
        console.error('初始化失败:', error);
        process.exit(1);
    }
}
// 执行初始化
initData().then(() => {
    console.log('脚本执行完成');
    process.exit(0);
}).catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
});
