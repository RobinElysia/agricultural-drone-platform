import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIChat } from '@/types'
import { aiAPI } from '@/api'

export const useAIStore = defineStore('ai', () => {
  // 状态
  const chats = ref<AIChat[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isChatOpen = ref(false)
  const currentQuestion = ref('')

  // 计算属性
  const hasChats = computed(() => chats.value.length > 0)
  const lastChat = computed(() => chats.value[chats.value.length - 1] || null)
  const chatCount = computed(() => chats.value.length)

  // 发送问题
  const sendQuestion = async (question: string, context?: string) => {
    isLoading.value = true
    error.value = null
    currentQuestion.value = question

    try {
      const response = await aiAPI.chat(question, context)

      if (response.code === 200) {
        const chat = response.data
        chats.value.push(chat)
        return chat
      }

      error.value = response.message || 'AI 回答失败'
      return null
    } catch (e: any) {
      error.value = e.response?.data?.message || 'AI 回答失败，请检查网络连接'
      return null
    } finally {
      isLoading.value = false
      currentQuestion.value = ''
    }
  }

  // 获取历史记录
  const fetchHistory = async () => {
    isLoading.value = true
    error.value = null

    try {
      const response = await aiAPI.getHistory()

      if (response.code === 200) {
        chats.value = response.data
        return true
      }

      error.value = response.message || '获取历史记录失败'
      return false
    } catch (e: any) {
      error.value = e.response?.data?.message || '获取历史记录失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 清除历史记录
  const clearHistory = async () => {
    isLoading.value = true
    error.value = null

    try {
      const response = await aiAPI.clearHistory()

      if (response.code === 200) {
        chats.value = []
        return true
      }

      error.value = response.message || '清除历史记录失败'
      return false
    } catch (e: any) {
      error.value = e.response?.data?.message || '清除历史记录失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 切换聊天窗口
  const toggleChat = () => {
    isChatOpen.value = !isChatOpen.value
  }

  // 打开聊天窗口
  const openChat = () => {
    isChatOpen.value = true
  }

  // 关闭聊天窗口
  const closeChat = () => {
    isChatOpen.value = false
  }

  // 清除错误
  const clearError = () => {
    error.value = null
  }

  // 添加本地聊天记录（用于即时显示）
  const addLocalChat = (question: string, answer: string) => {
    const chat: AIChat = {
      id: Date.now().toString(),
      question,
      answer,
      timestamp: new Date().toISOString()
    }
    chats.value.push(chat)
  }

  return {
    // 状态
    chats,
    isLoading,
    error,
    isChatOpen,
    currentQuestion,

    // 计算属性
    hasChats,
    lastChat,
    chatCount,

    // 方法
    sendQuestion,
    fetchHistory,
    clearHistory,
    toggleChat,
    openChat,
    closeChat,
    clearError,
    addLocalChat
  }
})
