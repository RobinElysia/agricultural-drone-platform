import { ResponseUtil } from '../utils/response';
import redisService from '../services/redis';
import { ModelFactory } from '../models';
import axios from 'axios';
import { config } from '../config';
// 高德天气API配置
const AMAP_KEY = config.amap.key;
const AMAP_CITY = config.amap.city;
const AMAP_WEATHER_URL = 'https://restapi.amap.com/v3/weather/weatherInfo';
// 风力等级映射
const windPowerToLevel = (windPower) => {
    if (windPower.includes('≤3'))
        return 2;
    if (windPower.includes('4-5'))
        return 4;
    if (windPower.includes('6-7'))
        return 6;
    if (windPower.includes('8-9'))
        return 8;
    if (windPower.includes('≥10'))
        return 10;
    return 2;
};
// 环境控制器
export class EnvironmentController {
    // 获取环境信息（从高德天气API）
    static async getEnvironment(req, res) {
        try {
            console.log('🌤️ 正在从高德天气API获取环境信息...');
            // 调用高德天气API
            const response = await axios.get(AMAP_WEATHER_URL, {
                params: {
                    key: AMAP_KEY,
                    city: AMAP_CITY,
                    extensions: 'base'
                }
            });
            console.log('高德API响应:', response.data);
            if (response.data.status === '1' && response.data.lives && response.data.lives.length > 0) {
                const weatherData = response.data.lives[0];
                // 转换为系统格式
                const environment = ModelFactory.createEnvironment({
                    temperature: parseFloat(weatherData.temperature_float || weatherData.temperature),
                    weather: weatherData.weather,
                    windLevel: windPowerToLevel(weatherData.windpower),
                    humidity: parseFloat(weatherData.humidity_float || weatherData.humidity),
                    location: { lat: 39.9, lng: 116.4 },
                    windDirection: weatherData.winddirection,
                    reportTime: weatherData.reporttime
                });
                // 保存到Redis
                await redisService.saveEnvironment(environment);
                console.log('✅ 环境信息已更新:', environment);
                return res.json(ResponseUtil.success(environment, '获取环境信息成功'));
            }
            else {
                console.error('❌ 高德API返回错误:', response.data);
                throw new Error('高德天气API返回数据格式错误');
            }
        }
        catch (error) {
            console.error('❌ 获取环境信息错误:', error.message);
            // 如果API失败，尝试从Redis获取缓存数据
            try {
                const cachedEnvironment = await redisService.getLatestEnvironment();
                if (cachedEnvironment) {
                    console.log('⚠️ 使用缓存的环境数据');
                    return res.json(ResponseUtil.success(cachedEnvironment, '获取环境信息成功（缓存）'));
                }
            }
            catch (cacheError) {
                console.error('获取缓存数据失败:', cacheError);
            }
            // 如果都失败，返回模拟数据
            const mockEnvironment = ModelFactory.createEnvironment({
                temperature: 25,
                weather: '晴',
                windLevel: 2,
                humidity: 55,
                location: { lat: 39.9, lng: 116.4 }
            });
            return res.json(ResponseUtil.success(mockEnvironment, '获取环境信息成功（模拟数据）'));
        }
    }
    // 订阅环境更新（模拟）
    static async subscribeEnvironment(req, res) {
        try {
            // 模拟订阅成功
            return res.json(ResponseUtil.success(null, '订阅环境更新成功'));
        }
        catch (error) {
            console.error('订阅环境更新错误:', error);
            return res.status(500).json(ResponseUtil.internalError('订阅环境更新失败'));
        }
    }
    // 更新环境信息（模拟）
    static async updateEnvironment(req, res) {
        try {
            const { temperature, weather, windLevel, humidity, location } = req.body;
            const environment = ModelFactory.createEnvironment({
                temperature: temperature ?? 25,
                weather: weather || '晴',
                windLevel: windLevel ?? 2,
                humidity: humidity ?? 55,
                location: location || { lat: 39.9, lng: 116.4 }
            });
            await redisService.saveEnvironment(environment);
            // 发布实时数据
            await redisService.publishRealtimeData({
                type: 'environment',
                data: environment,
                timestamp: new Date().toISOString()
            });
            return res.json(ResponseUtil.success(environment, '更新环境信息成功'));
        }
        catch (error) {
            console.error('更新环境信息错误:', error);
            return res.status(500).json(ResponseUtil.internalError('更新环境信息失败'));
        }
    }
    // 获取环境历史
    static async getEnvironmentHistory(req, res) {
        try {
            // 从Redis获取环境历史
            const history = await redisService.redis.lRange('environment_history', 0, 9);
            const environments = history.map(item => JSON.parse(item));
            return res.json(ResponseUtil.success(environments, '获取环境历史成功'));
        }
        catch (error) {
            console.error('获取环境历史错误:', error);
            return res.status(500).json(ResponseUtil.internalError('获取环境历史失败'));
        }
    }
}
export default EnvironmentController;
