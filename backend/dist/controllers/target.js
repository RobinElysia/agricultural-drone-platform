import { ResponseUtil } from '../utils/response';
import redisService from '../services/redis';
import { ModelFactory } from '../models';
// 作业目标控制器
export class TargetController {
    // 获取所有作业目标
    static async getTargets(req, res) {
        try {
            const targets = await redisService.getAllTargets();
            console.log('获取作业目标列表:', targets.length, '个目标');
            return res.json(ResponseUtil.success(targets, '获取作业目标列表成功'));
        }
        catch (error) {
            console.error('获取作业目标列表错误:', error);
            return res.status(500).json(ResponseUtil.internalError('获取作业目标列表失败'));
        }
    }
    // 获取单个作业目标
    static async getTarget(req, res) {
        try {
            const { id } = req.params;
            const target = await redisService.getTarget(id);
            if (!target) {
                return res.status(404).json(ResponseUtil.notFound('作业目标不存在'));
            }
            return res.json(ResponseUtil.success(target, '获取作业目标成功'));
        }
        catch (error) {
            console.error('获取作业目标错误:', error);
            return res.status(500).json(ResponseUtil.internalError('获取作业目标失败'));
        }
    }
    // 创建作业目标
    static async createTarget(req, res) {
        try {
            const { name, area, pesticide, status, location } = req.body;
            console.log('收到创建作业目标请求:', { name, area, pesticide, status });
            // 验证必填字段
            if (!name || !area || !pesticide) {
                return res.status(400).json(ResponseUtil.badRequest('缺少必要参数'));
            }
            // 验证数值
            if (area <= 0 || pesticide <= 0) {
                return res.status(400).json(ResponseUtil.badRequest('面积和农药用量必须大于0'));
            }
            // 验证状态
            const validStatuses = ['pending', 'in-progress', 'completed'];
            const targetStatus = status || 'pending';
            if (!validStatuses.includes(targetStatus)) {
                return res.status(400).json(ResponseUtil.badRequest('无效的状态'));
            }
            // 创建作业目标
            const target = ModelFactory.createWorkTarget({
                name,
                area: Number(area),
                pesticide: Number(pesticide),
                status: targetStatus,
                location: location || { lat: 39.90923, lng: 116.397428 }
            });
            console.log('创建的作业目标:', target);
            // 保存到Redis
            await redisService.saveTarget(target);
            console.log('作业目标已保存到Redis');
            return res.json(ResponseUtil.success(target, '创建作业目标成功'));
        }
        catch (error) {
            console.error('创建作业目标错误:', error);
            return res.status(500).json(ResponseUtil.internalError('创建作业目标失败'));
        }
    }
    // 更新作业目标
    static async updateTarget(req, res) {
        try {
            const { id } = req.params;
            const { name, area, pesticide, status, location } = req.body;
            // 获取现有目标
            const existingTarget = await redisService.getTarget(id);
            if (!existingTarget) {
                return res.status(404).json(ResponseUtil.notFound('作业目标不存在'));
            }
            // 验证状态
            if (status) {
                const validStatuses = ['pending', 'in-progress', 'completed'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json(ResponseUtil.badRequest('无效的状态'));
                }
            }
            // 验证数值
            if (area !== undefined && area <= 0) {
                return res.status(400).json(ResponseUtil.badRequest('面积必须大于0'));
            }
            if (pesticide !== undefined && pesticide <= 0) {
                return res.status(400).json(ResponseUtil.badRequest('农药用量必须大于0'));
            }
            // 更新目标
            const updatedTarget = {
                ...existingTarget,
                name: name || existingTarget.name,
                area: area !== undefined ? Number(area) : existingTarget.area,
                pesticide: pesticide !== undefined ? Number(pesticide) : existingTarget.pesticide,
                status: status || existingTarget.status,
                location: location || existingTarget.location,
                updatedAt: new Date().toISOString()
            };
            // 保存到Redis
            await redisService.saveTarget(updatedTarget);
            return res.json(ResponseUtil.success(updatedTarget, '更新作业目标成功'));
        }
        catch (error) {
            console.error('更新作业目标错误:', error);
            return res.status(500).json(ResponseUtil.internalError('更新作业目标失败'));
        }
    }
    // 完成作业目标
    static async completeTarget(req, res) {
        try {
            const { id } = req.params;
            console.log('收到完成作业目标请求, ID:', id);
            // 获取现有目标
            const existingTarget = await redisService.getTarget(id);
            if (!existingTarget) {
                console.log('作业目标不存在:', id);
                return res.status(404).json(ResponseUtil.notFound('作业目标不存在'));
            }
            console.log('当前目标状态:', existingTarget.status);
            // 检查当前状态
            if (existingTarget.status === 'completed') {
                return res.status(400).json(ResponseUtil.badRequest('作业目标已完成'));
            }
            // 更新状态为已完成
            const completedTarget = {
                ...existingTarget,
                status: 'completed',
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            console.log('更新后的目标:', completedTarget);
            // 保存到Redis
            await redisService.saveTarget(completedTarget);
            console.log('作业目标已完成并保存');
            return res.json(ResponseUtil.success(completedTarget, '作业目标已完成'));
        }
        catch (error) {
            console.error('完成作业目标错误:', error);
            return res.status(500).json(ResponseUtil.internalError('完成作业目标失败'));
        }
    }
    // 删除作业目标
    static async deleteTarget(req, res) {
        try {
            const { id } = req.params;
            // 检查目标是否存在
            const existingTarget = await redisService.getTarget(id);
            if (!existingTarget) {
                return res.status(404).json(ResponseUtil.notFound('作业目标不存在'));
            }
            // 从Redis删除
            await redisService.deleteTarget(id);
            return res.json(ResponseUtil.success(null, '删除作业目标成功'));
        }
        catch (error) {
            console.error('删除作业目标错误:', error);
            return res.status(500).json(ResponseUtil.internalError('删除作业目标失败'));
        }
    }
}
export default TargetController;
