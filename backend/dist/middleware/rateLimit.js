import rateLimit from 'express-rate-limit';
import { config } from '../config';
// 速率限制中间件
export const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
        // 使用IP地址作为key
        keyGenerator: (req) => req.ip || 'unknown'
    });
};
// 通用速率限制
export const generalRateLimit = createRateLimit(config.rateLimit.windowMs, config.rateLimit.max, '请求过于频繁，请稍后再试');
// 登录速率限制（更严格）
export const loginRateLimit = createRateLimit(15 * 60 * 1000, // 15分钟
10, // 最多10次登录尝试
'登录尝试过于频繁，请15分钟后再试');
// 注册速率限制（相对宽松）
export const registerRateLimit = createRateLimit(60 * 60 * 1000, // 1小时
5, // 最多5次注册
'注册请求过于频繁，请1小时后再试');
// 认证相关速率限制（用于其他认证接口）
export const authRateLimit = createRateLimit(15 * 60 * 1000, // 15分钟
50, // 最多50次
'请求过于频繁，请稍后再试');
// AI对话速率限制
export const aiRateLimit = createRateLimit(60 * 1000, // 1分钟
10, // 最多10次
'AI对话请求过于频繁，请稍后再试');
// 无人机控制速率限制
export const droneControlRateLimit = createRateLimit(60 * 1000, // 1分钟
20, // 最多20次
'无人机控制请求过于频繁，请稍后再试');
