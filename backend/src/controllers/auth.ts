import { Request, Response } from 'express'
import { ResponseUtil } from '../utils/response'
import { AuthUtil, UserRole } from '../utils/auth'
import redisService from '../services/redis'
import { ModelFactory } from '../models'

// 认证控制器
export class AuthController {
  // 登录
  static async login(req: Request, res: Response) {
    try {
      const { username, password, role } = req.body

      // 验证输入
      if (!username || !password || !role) {
        return res.status(400).json(ResponseUtil.badRequest('缺少必要参数'))
      }

      // 验证角色
      if (!['admin', 'operator', 'agriculturalist'].includes(role)) {
        return res.status(400).json(ResponseUtil.badRequest('无效的角色'))
      }

      // 查找用户
      const user = await redisService.getUserByUsername(username)
      
      if (!user) {
        return res.status(401).json(ResponseUtil.unauthorized('用户名或密码错误'))
      }

      // 验证密码
      const isValidPassword = await AuthUtil.verifyPassword(password, user.password)
      
      if (!isValidPassword) {
        return res.status(401).json(ResponseUtil.unauthorized('用户名或密码错误'))
      }

      // 验证角色
      if (user.role !== role) {
        return res.status(403).json(ResponseUtil.forbidden('角色不匹配'))
      }

      // 生成JWT令牌
      const token = AuthUtil.generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      })

      // 返回用户信息（不包含密码）
      const userInfo = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt
      }

      return res.json(ResponseUtil.success({
        token,
        user: userInfo,
        expiresIn: 3600 // 1小时
      }, '登录成功'))

    } catch (error) {
      console.error('登录错误:', error)
      return res.status(500).json(ResponseUtil.internalError('登录失败'))
    }
  }

  // 注册
  static async register(req: Request, res: Response) {
    try {
      const { username, password, confirmPassword, role, name, realName } = req.body

      const cleanUsername = typeof username === 'string' ? username.trim() : ''
      const cleanName = (typeof name === 'string' ? name : '') || (typeof realName === 'string' ? realName : '')

      if (!cleanUsername || !cleanName || !password || !confirmPassword || !role) {
        return res.status(400).json(ResponseUtil.badRequest('缺少必要参数'))
      }

      if (password !== confirmPassword) {
        return res.status(400).json(ResponseUtil.badRequest('两次输入的密码不一致'))
      }

      if (password.length < 6) {
        return res.status(400).json(ResponseUtil.badRequest('密码长度至少为6位'))
      }

      const normalizedRoleInput = String(role).trim()
      const roleMap: Record<string, UserRole | undefined> = {
        管理员: 'admin',
        作业员: 'operator',
        农业员: 'agriculturalist',
        admin: 'admin',
        administrator: 'admin',
        operator: 'operator',
        agriculturalist: 'agriculturalist',
        farmer: 'agriculturalist'
      }
      const normalizedRole = roleMap[normalizedRoleInput] || roleMap[normalizedRoleInput.toLowerCase()]

      if (!normalizedRole) {
        return res.status(400).json(ResponseUtil.badRequest('无效的角色'))
      }

      const existingUser = await redisService.getUserByUsername(cleanUsername)
      if (existingUser) {
        return res.status(409).json(ResponseUtil.conflict('用户名已存在'))
      }

      const hashedPassword = await AuthUtil.hashPassword(password)

      const user = ModelFactory.createUser({
        username: cleanUsername,
        password: hashedPassword,
        role: normalizedRole,
        name: cleanName.trim()
      })

      await redisService.saveUser(user)

      const userInfo = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      }

      return res.json(ResponseUtil.success(userInfo, '注册成功'))
    } catch (error) {
      console.error('注册错误:', error)
      return res.status(500).json(ResponseUtil.internalError('注册失败'))
    }
  }

  // 登出
  static async logout(req: Request, res: Response) {
    // 实际应用中，这里可以清除服务器端的会话
    // 由于使用JWT，登出主要在客户端处理令牌清除
    return res.json(ResponseUtil.success(null, '登出成功'))
  }

  // 获取用户信息
  static async getProfile(req: Request, res: Response) {
    try {
      const user = req.user
      
      if (!user) {
        return res.status(401).json(ResponseUtil.unauthorized('未授权'))
      }

      // 从Redis获取完整用户信息
      const fullUser = await redisService.getUser(user.id)
      
      if (!fullUser) {
        return res.status(404).json(ResponseUtil.notFound('用户不存在'))
      }

      // 返回用户信息（不包含密码）
      const userInfo = {
        id: fullUser.id,
        username: fullUser.username,
        name: fullUser.name,
        role: fullUser.role,
        email: fullUser.email,
        phone: fullUser.phone,
        createdAt: fullUser.createdAt
      }

      return res.json(ResponseUtil.success(userInfo, '获取用户信息成功'))

    } catch (error) {
      console.error('获取用户信息错误:', error)
      return res.status(500).json(ResponseUtil.internalError('获取用户信息失败'))
    }
  }

  // 初始化管理员账户（用于首次运行）
  static async initAdmin(req: Request, res: Response) {
    try {
      const { username, password } = req.body

      if (!username || !password) {
        return res.status(400).json(ResponseUtil.badRequest('缺少必要参数'))
      }

      // 检查是否已存在管理员
      const existingAdmin = await redisService.getUserByUsername(username)
      if (existingAdmin) {
        return res.status(409).json(ResponseUtil.conflict('管理员账户已存在'))
      }

      // 密码哈希
      const hashedPassword = await AuthUtil.hashPassword(password)

      // 创建管理员用户
      const adminUser = ModelFactory.createUser({
        username,
        password: hashedPassword,
        role: 'admin',
        name: '系统管理员'
      })

      // 保存到Redis
      await redisService.saveUser(adminUser)

      return res.json(ResponseUtil.success(null, '管理员账户初始化成功'))

    } catch (error) {
      console.error('初始化管理员错误:', error)
      return res.status(500).json(ResponseUtil.internalError('初始化管理员失败'))
    }
  }

  // 获取所有用户列表
  static async getAllUsers(req: Request, res: Response) {
    try {
      // 从Redis获取所有用户
      const allUsers = await redisService.getAllUsers()
      
      // 返回用户列表（不包含密码）
      const users = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt
      }))

      return res.json(ResponseUtil.success(users, '获取用户列表成功'))

    } catch (error) {
      console.error('获取用户列表错误:', error)
      return res.status(500).json(ResponseUtil.internalError('获取用户列表失败'))
    }
  }
}

export default AuthController
