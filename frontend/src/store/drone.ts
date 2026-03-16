import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { DroneOperation, DroneStatus } from '@/types'
import { droneAPI, operationAPI } from '@/api'

const getErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.message || fallback
}

export const useDroneStore = defineStore('drone', () => {
  const drones = ref<DroneStatus[]>([])
  const operations = ref<DroneOperation[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const selectedDrone = ref<DroneStatus | null>(null)

  const onlineDrones = computed(() => drones.value.filter(d => d.status === 'online'))
  const flyingDrones = computed(() => drones.value.filter(d => d.status === 'flying'))
  const chargingDrones = computed(() => drones.value.filter(d => d.status === 'charging'))
  const offlineDrones = computed(() => drones.value.filter(d => d.status === 'offline'))
  const totalDrones = computed(() => drones.value.length)
  const avgBattery = computed(() => {
    if (drones.value.length === 0) return 0
    const total = drones.value.reduce((sum, drone) => sum + drone.battery, 0)
    return Math.round(total / drones.value.length)
  })

  const fetchDrones = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await droneAPI.getDrones()
      if (response.code === 200) {
        drones.value = response.data
        return true
      }
      error.value = response.message || '获取无人机列表失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '获取无人机列表失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const fetchDrone = async (id: string) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await droneAPI.getDrone(id)
      if (response.code === 200) {
        selectedDrone.value = response.data
        return true
      }
      error.value = response.message || '获取无人机信息失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '获取无人机信息失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const createDrone = async (data: Partial<DroneStatus>) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await droneAPI.createDrone(data)
      if (response.code === 200) {
        drones.value.push(response.data)
        return true
      }
      error.value = response.message || '创建无人机失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '创建无人机失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const updateDrone = async (id: string, data: Partial<DroneStatus>) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await droneAPI.updateDrone(id, data)
      if (response.code === 200) {
        const index = drones.value.findIndex(item => item.id === id)
        if (index !== -1) {
          drones.value[index] = response.data
        }
        if (selectedDrone.value?.id === id) {
          selectedDrone.value = response.data
        }
        return true
      }
      error.value = response.message || '更新无人机失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '更新无人机失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const deleteDrone = async (id: string) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await droneAPI.deleteDrone(id)
      if (response.code === 200) {
        drones.value = drones.value.filter(item => item.id !== id)
        if (selectedDrone.value?.id === id) {
          selectedDrone.value = null
        }
        return true
      }
      error.value = response.message || '删除无人机失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '删除无人机失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const controlDrone = async (id: string, operation: string, params?: Record<string, any>) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await droneAPI.controlDrone(id, operation, params)
      if (response.code === 200) {
        operations.value.push(response.data)
        return true
      }
      error.value = response.message || '控制无人机失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '控制无人机失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const fetchOperations = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await operationAPI.getOperations()
      if (response.code === 200) {
        operations.value = response.data
        return true
      }
      error.value = response.message || '获取操作历史失败'
      return false
    } catch (e: any) {
      error.value = getErrorMessage(e, '获取操作历史失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const selectDrone = (drone: DroneStatus | null) => {
    selectedDrone.value = drone
  }

  const clearError = () => {
    error.value = null
  }

  const updateDroneStatus = (status: DroneStatus) => {
    const index = drones.value.findIndex(item => item.id === status.id)
    if (index !== -1) {
      drones.value[index] = status
    } else {
      drones.value.push(status)
    }

    if (selectedDrone.value?.id === status.id) {
      selectedDrone.value = status
    }
  }

  return {
    drones,
    operations,
    isLoading,
    error,
    selectedDrone,
    onlineDrones,
    flyingDrones,
    chargingDrones,
    offlineDrones,
    totalDrones,
    avgBattery,
    fetchDrones,
    fetchDrone,
    createDrone,
    updateDrone,
    deleteDrone,
    controlDrone,
    fetchOperations,
    selectDrone,
    clearError,
    updateDroneStatus
  }
})
