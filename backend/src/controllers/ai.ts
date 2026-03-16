import { Request, Response } from 'express'
import { ResponseUtil } from '../utils/response'
import aiService from '../services/ai'

// AI控制器
export class AIController {
  // AI对话
  static async chat(req: Request, res: Response) {
    try {
      const { question, context } = req.body

      if (!question) {
        return res.status(400).json(ResponseUtil.badRequest('缺少问题'))
      }

      // 获取用户ID
      const userId = req.user?.id || 'anonymous'

      // 调用AI服务
      const answer = await aiService.callQianwen(question, context)

      // 保存对话记录
      await aiService.saveChat(userId, question, answer, context)

      return res.json(ResponseUtil.success({
        id: Date.now().toString(),
        question,
        answer,
        timestamp: new Date().toISOString()
      }, 'AI回答成功'))

    } catch (error) {
      console.error('AI对话错误:', error)
      return res.status(500).json(ResponseUtil.internalError('AI对话失败'))
    }
  }

  // 获取对话历史
  static async getHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id || 'anonymous'
      const history = await aiService.getChatHistory(userId, 50)
      
      return res.json(ResponseUtil.success(history, '获取对话历史成功'))

    } catch (error) {
      console.error('获取对话历史错误:', error)
      return res.status(500).json(ResponseUtil.internalError('获取对话历史失败'))
    }
  }

  // 清除对话历史
  static async clearHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id || 'anonymous'
      await aiService.clearChatHistory(userId)
      
      return res.json(ResponseUtil.success(null, '清除对话历史成功'))

    } catch (error) {
      console.error('清除对话历史错误:', error)
      return res.status(500).json(ResponseUtil.internalError('清除对话历史失败'))
    }
  }

  // 获取领域知识
  static async getDomainKnowledge(req: Request, res: Response) {
    try {
      const knowledge = await aiService.getDomainKnowledge()
      return res.json(ResponseUtil.success(knowledge, '获取领域知识成功'))
    } catch (error) {
      console.error('获取领域知识错误:', error)
      return res.status(500).json(ResponseUtil.internalError('获取领域知识失败'))
    }
  }
}

export default AIController