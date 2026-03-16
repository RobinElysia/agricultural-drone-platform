import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { EnvironmentInfo } from '@/types'
import { environmentAPI } from '@/api'

const AUTO_REFRESH_MS = 3_600_000

const getErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.message || fallback
}

export const useEnvironmentStore = defineStore('environment', () => {
  const environment = ref<EnvironmentInfo | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isSubscribed = ref(false)
  const refreshTimer = ref<number | null>(null)

  const temperature = computed(() => environment.value?.temperature || 0)
  const weather = computed(() => environment.value?.weather || '未知')
  const windLevel = computed(() => environment.value?.windLevel || 0)
  const humidity = computed(() => environment.value?.humidity || 0)
  const windDirection = computed(() => environment.value?.windDirection || '')
  const reportTime = computed(() => environment.value?.reportTime || '')

  const isSafeForFlying = computed(() => {
    if (!environment.value) return false
    return (
      environment.value.windLevel < 4 &&
      environment.value.temperature > -10 &&
      environment.value.temperature < 40
    )
  })

  const flightStatus = computed(() => {
    if (!environment.value) {
      return {
        status: 'unknown',
        level: 0,
        message: '暂无环境数据',
        color: 'gray',
        icon: '❔'
      }
    }

    const temp = environment.value.temperature
    const humid = environment.value.humidity
    const wind = environment.value.windLevel
    const dangers: string[] = []

    if (temp < 0) dangers.push('温度过低，电池活性下降')
    else if (temp > 40) dangers.push('温度过高，可能触发过热保护')

    if (humid > 90) dangers.push('湿度过高，电子元件易短路')
    else if (humid < 20) dangers.push('湿度过低，静电风险增加')

    if (wind > 4) dangers.push('风力过大，飞行不稳定')

    if (dangers.length > 0) {
      return {
        status: 'danger',
        level: 0,
        message: dangers.join('；'),
        color: 'red',
        icon: '⚠️'
      }
    }

    const warnings: string[] = []
    if (temp >= 0 && temp < 10) warnings.push('温度偏低，注意电池续航')
    else if (temp > 35 && temp <= 40) warnings.push('温度偏高，注意散热')

    if (humid > 85 && humid <= 90) warnings.push('湿度偏高，谨慎作业')
    else if (humid >= 20 && humid < 40) warnings.push('湿度偏低，注意静电')

    if (wind === 4) warnings.push('风力较大，建议轻载作业')
    else if (wind === 3) warnings.push('风力适中，可正常作业')

    if (warnings.length > 0) {
      return {
        status: 'warning',
        level: 1,
        message: warnings.join('；'),
        color: 'yellow',
        icon: '⚠️'
      }
    }

    const isOptimal = temp >= 15 && temp <= 30 && humid >= 40 && humid <= 70 && wind <= 2
    if (isOptimal) {
      return {
        status: 'optimal',
        level: 3,
        message: '环境条件最佳，适合植保作业',
        color: 'green',
        icon: '✅'
      }
    }

    const isGood = temp >= 10 && temp <= 35 && humid >= 20 && humid <= 85 && wind <= 3
    if (isGood) {
      return {
        status: 'good',
        level: 2,
        message: '环境条件良好，可以飞行',
        color: 'green',
        icon: '✅'
      }
    }

    return {
      status: 'acceptable',
      level: 1,
      message: '环境条件可接受，注意监控',
      color: 'blue',
      icon: 'ℹ️'
    }
  })

  const weatherIcon = computed(() => {
    const w = environment.value?.weather || ''
    if (w.includes('晴')) return '☀️'
    if (w.includes('雨')) return '🌧️'
    if (w.includes('雪')) return '❄️'
    if (w.includes('阴') || w.includes('云')) return '☁️'
    if (w.includes('雾')) return '🌫️'
    return '🌤️'
  })

  const fetchEnvironment = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await environmentAPI.getEnvironment()
      if (response.success) {
        environment.value = response.data
        return true
      }
      error.value = response.message || '获取环境信息失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '获取环境信息失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const startAutoRefresh = () => {
    fetchEnvironment()
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value)
    }
    refreshTimer.value = window.setInterval(() => {
      fetchEnvironment()
    }, AUTO_REFRESH_MS)
  }

  const stopAutoRefresh = () => {
    if (!refreshTimer.value) return
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }

  const subscribeEnvironment = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await environmentAPI.subscribeEnvironment()
      if (response.success) {
        isSubscribed.value = true
        return true
      }
      error.value = response.message || '订阅环境更新失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '订阅环境更新失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const updateEnvironment = (env: EnvironmentInfo) => {
    environment.value = env
  }

  const clearError = () => {
    error.value = null
  }

  return {
    environment,
    isLoading,
    error,
    isSubscribed,
    temperature,
    weather,
    windLevel,
    humidity,
    windDirection,
    reportTime,
    isSafeForFlying,
    flightStatus,
    weatherIcon,
    fetchEnvironment,
    startAutoRefresh,
    stopAutoRefresh,
    subscribeEnvironment,
    updateEnvironment,
    clearError
  }
})
