import axios from 'axios'
import { config } from '../config'
import redisService from './redis'
import { ModelFactory } from '../models'

// AI服务
export class AIService {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = config.qianwen.apiKey
    this.baseUrl = config.qianwen.baseUrl
  }

  // 检查API配置
  private checkConfig(): void {
    if (!this.apiKey) {
      throw new Error('通义千问API密钥未配置')
    }
  }

  // 调用通义千问API
  async callQianwen(prompt: string, context?: string): Promise<string> {
    this.checkConfig()

    try {
      const fullPrompt = context 
        ? `上下文：${context}\n\n问题：${prompt}`
        : prompt

      const response = await axios.post(
        this.baseUrl,
        {
          model: 'qwen-turbo',
          input: {
            messages: [
              {
                role: 'user',
                content: fullPrompt
              }
            ]
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 1000
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      if (response.data?.output?.text) {
        return response.data.output.text
      } else {
        throw new Error('API响应格式异常')
      }
    } catch (error: any) {
      console.error('通义千问API调用失败:', error.message)
      
      // 如果API调用失败，返回本地预设回答
      return this.getLocalResponse(prompt)
    }
  }

  // 本地预设回答（当API不可用时）
  private getLocalResponse(question: string): string {
    const lowerQuestion = question.toLowerCase()
    
    if (lowerQuestion.includes('电量') || lowerQuestion.includes('电池')) {
      return '检查无人机电量的方法：\n1. 在数据大屏左侧查看无人机状态卡片\n2. 电量显示为百分比，绿色表示充足（>50%），黄色表示中等（20-50%），红色表示不足（<20%）\n3. 电量低于20%时建议返回充电\n4. 可以在无人机管理页面查看详细电量信息'
    }
    
    if (lowerQuestion.includes('飞行') || lowerQuestion.includes('适合飞行')) {
      return '适合飞行的条件：\n1. 环境温度：-10°C 至 40°C\n2. 风级：小于4级\n3. 无雨雪天气\n4. 电量充足（>50%）\n5. 确认四下无人\n6. 检查载荷是否正常'
    }
    
    if (lowerQuestion.includes('路径') || lowerQuestion.includes('规划')) {
      return '路径规划方法：\n1. 在数据大屏中部地图区域\n2. 选择无人机和作业目标\n3. 点击"路径规划"按钮\n4. 系统会自动计算最优路径\n5. 点击"执行"开始飞行'
    }
    
    if (lowerQuestion.includes('故障') || lowerQuestion.includes('问题')) {
      return '常见故障排查：\n1. 无法起飞：检查电量、电机状态、环境条件\n2. 信号丢失：检查网络连接，尝试重启\n3. 偏离航线：检查GPS信号，重新规划路径\n4. 电量异常：检查电池健康状态\n5. 如无法解决，请联系管理员'
    }
    
    if (lowerQuestion.includes('喷洒') || lowerQuestion.includes('农药')) {
      return '农药喷洒注意事项：\n1. 确认四下无人\n2. 检查农药装载量\n3. 设置合适的喷洒高度（通常2-3米）\n4. 选择合适的喷洒模式\n5. 喷洒后及时清洗设备\n6. 注意风向，避免漂移'
    }
    
    if (lowerQuestion.includes('充电') || lowerQuestion.includes('换电')) {
      return '充电/换电操作：\n1. 在数据大屏右侧查看换电站信息\n2. 选择最近的可用换电站\n3. 规划换电路径\n4. 执行换电操作\n5. 等待充电完成（约10-15分钟）'
    }
    
    if (lowerQuestion.includes('安全') || lowerQuestion.includes('操作')) {
      return '安全操作指南：\n1. 操作前检查设备状态\n2. 确认环境条件适合飞行\n3. 遵守当地法规\n4. 保持与无人机的通信\n5. 准备应急方案\n6. 定期维护设备'
    }
    
    // 默认回答
    return `关于"${question}"，我可以为您提供以下帮助：\n\n1. 无人机状态监控\n2. 环境条件分析\n3. 路径规划指导\n4. 故障排查建议\n5. 安全操作指导\n\n请告诉我您具体想了解什么，我会尽力为您解答。`
  }

  // 保存对话记录
  async saveChat(userId: string, question: string, answer: string, context?: string): Promise<void> {
    const chat = ModelFactory.createAIChat({
      userId,
      question,
      answer,
      context
    })
    
    await redisService.saveAIChat(chat)
  }

  // 获取对话历史
  async getChatHistory(userId: string, limit: number = 50): Promise<any[]> {
    return await redisService.getAIChatHistory(userId, limit)
  }

  // 清除对话历史
  async clearChatHistory(userId: string): Promise<void> {
    await redisService.clearAIChatHistory(userId)
  }

  // 获取领域知识
  async getDomainKnowledge(): Promise<string> {
    return `
农业无人机管理平台领域知识：

1. 无人机状态监控：
   - 电量：0-100%，低于20%需充电
   - 电机转速：正常范围0-5000 RPM
   - 载荷：农药容量，通常10-50L
   - 状态：在线、离线、充电中、飞行中

2. 环境条件：
   - 温度：-10°C 至 40°C 适合飞行
   - 风级：小于4级适合飞行
   - 天气：晴天最佳，雨雪天气避免飞行
   - 湿度：影响农药喷洒效果

3. 作业流程：
   - 规划路径 → 起飞 → 喷洒 → 降落 → 充电
   - 确认四下无人后执行喷洒
   - 换电站自动充电

4. 安全规范：
   - 操作员需持证上岗
   - 定期设备检查
   - 应急预案准备
   - 遵守飞行空域规定
    `
  }
}

// 默认导出
export default new AIService()