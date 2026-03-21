import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserInfo, UserRole } from '@/types'
import { authAPI } from '@/api'

const getErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.message || fallback
}

export const useUserStore = defineStore('user', () => {
  const user = ref<UserInfo | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))
  const userRole = computed(() => user.value?.role || null)
  const userName = computed(() => user.value?.name || user.value?.username || '')
  const isAdmin = computed(() => userRole.value === 'admin')
  const isOperator = computed(() => userRole.value === 'operator')
  const isAgriculturalist = computed(() => userRole.value === 'agriculturalist')

  const restoreState = () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken) {
      token.value = storedToken
    }

    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (e) {
        console.error('Failed to parse stored user:', e)
      }
    }
  }

  const login = async (username: string, password: string, role: UserRole) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await authAPI.login({ username, password, role })
      if (response.code === 200) {
        token.value = response.data.token
        user.value = response.data.user
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        localStorage.setItem('userRole', response.data.user.role)
        return true
      }
      error.value = response.message || '登录失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '登录失败，请检查网络连接')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const register = async (
    username: string,
    password: string,
    confirmPassword: string,
    role: UserRole,
    name: string
  ) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await authAPI.register({
        username,
        password,
        confirmPassword,
        role,
        name
      })
      if (response.code === 200) {
        return true
      }
      error.value = response.message || '注册失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '注册失败，请检查网络连接')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userRole')
      user.value = null
      token.value = null
      error.value = null
    }
  }

  const fetchProfile = async () => {
    if (!token.value) return
    isLoading.value = true
    error.value = null
    try {
      const response = await authAPI.getProfile()
      if (response.code === 200) {
        user.value = response.data
        localStorage.setItem('user', JSON.stringify(response.data))
        return true
      }
      error.value = response.message || '获取用户信息失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '获取用户信息失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    userRole,
    userName,
    isAdmin,
    isOperator,
    isAgriculturalist,
    restoreState,
    login,
    register,
    logout,
    fetchProfile,
    clearError
  }
})
