import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from '../config'

// JWT工具
export class AuthUtil {
  // 生成JWT令牌
  static generateToken(payload: Record<string, any>): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    })
  }

  // 验证JWT令牌
  static verifyToken(token: string): Record<string, any> | null {
    try {
      return jwt.verify(token, config.jwt.secret) as Record<string, any>
    } catch (error) {
      return null
    }
  }

  // 从请求头提取令牌
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null
    
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null
    }
    
    return parts[1]
  }

  // 密码哈希
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10)
    return await bcrypt.hash(password, salt)
  }

  // 验证密码
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }

  // 生成随机字符串
  static generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

// 角色类型
export type UserRole = 'admin' | 'operator' | 'agriculturalist'

// 权限检查中间件
export const requireRole = (roles: UserRole[]) => {
  return (req: any, res: any, next: any) => {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: '未授权' })
    }
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: '无权限访问' })
    }
    
    next()
  }
}

// 验证用户角色
export const validateRole = (role: string): role is UserRole => {
  return ['admin', 'operator', 'agriculturalist'].includes(role)
}