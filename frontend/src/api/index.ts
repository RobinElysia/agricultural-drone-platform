import axios, { type AxiosInstance, type AxiosResponse, type AxiosError } from 'axios'
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  DroneStatus,
  EnvironmentInfo,
  WorkTarget,
  UserInfo,
  ChargingStation,
  DroneOperation,
  AIChat,
  YoloTask,
  YoloDetectionResult,
  YoloVideoDetectionResult
} from '@/types'

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return api.post('/auth/login', data)
  },
  
  register: (data: RegisterRequest): Promise<ApiResponse<UserInfo>> => {
    return api.post('/auth/register', data)
  },
  
  logout: (): Promise<ApiResponse<null>> => {
    return api.post('/auth/logout')
  },
  
  getProfile: (): Promise<ApiResponse<UserInfo>> => {
    return api.get('/auth/profile')
  },
  
  getUsers: (): Promise<ApiResponse<UserInfo[]>> => {
    return api.get('/auth/users')
  }
}

// Drone API
export const droneAPI = {
  getDrones: (): Promise<ApiResponse<DroneStatus[]>> => {
    return api.get('/drones')
  },
  
  getDrone: (id: string): Promise<ApiResponse<DroneStatus>> => {
    return api.get(`/drones/${id}`)
  },
  
  createDrone: (data: Partial<DroneStatus>): Promise<ApiResponse<DroneStatus>> => {
    return api.post('/drones', data)
  },
  
  updateDrone: (id: string, data: Partial<DroneStatus>): Promise<ApiResponse<DroneStatus>> => {
    return api.put(`/drones/${id}`, data)
  },
  
  deleteDrone: (id: string): Promise<ApiResponse<null>> => {
    return api.delete(`/drones/${id}`)
  },
  
  controlDrone: (id: string, operation: string, params?: Record<string, any>): Promise<ApiResponse<DroneOperation>> => {
    return api.post(`/drones/${id}/control`, { operation, params })
  }
}

// Environment API
export const environmentAPI = {
  getEnvironment: (): Promise<ApiResponse<EnvironmentInfo>> => {
    return api.get('/environment')
  },
  
  subscribeEnvironment: (): Promise<ApiResponse<null>> => {
    return api.post('/environment/subscribe')
  }
}

// Work target API
export const targetAPI = {
  getTargets: (): Promise<ApiResponse<WorkTarget[]>> => {
    return api.get('/targets')
  },
  
  getTarget: (id: string): Promise<ApiResponse<WorkTarget>> => {
    return api.get(`/targets/${id}`)
  },
  
  createTarget: (data: Partial<WorkTarget>): Promise<ApiResponse<WorkTarget>> => {
    return api.post('/targets', data)
  },
  
  updateTarget: (id: string, data: Partial<WorkTarget>): Promise<ApiResponse<WorkTarget>> => {
    return api.put(`/targets/${id}`, data)
  },
  
  completeTarget: (id: string): Promise<ApiResponse<WorkTarget>> => {
    return api.put(`/targets/${id}/complete`)
  },
  
  deleteTarget: (id: string): Promise<ApiResponse<null>> => {
    return api.delete(`/targets/${id}`)
  }
}

// User API
export const userAPI = {
  getUsers: (): Promise<ApiResponse<UserInfo[]>> => {
    return api.get('/users')
  },
  
  getUser: (id: string): Promise<ApiResponse<UserInfo>> => {
    return api.get(`/users/${id}`)
  },
  
  createUser: (data: Partial<UserInfo>): Promise<ApiResponse<UserInfo>> => {
    return api.post('/users', data)
  },
  
  updateUser: (id: string, data: Partial<UserInfo>): Promise<ApiResponse<UserInfo>> => {
    return api.put(`/users/${id}`, data)
  },
  
  deleteUser: (id: string): Promise<ApiResponse<null>> => {
    return api.delete(`/users/${id}`)
  }
}

// Charging station API
export const chargingAPI = {
  getStations: (): Promise<ApiResponse<ChargingStation[]>> => {
    return api.get('/charging-stations')
  },
  
  getStation: (id: string): Promise<ApiResponse<ChargingStation>> => {
    return api.get(`/charging-stations/${id}`)
  },
  
  createStation: (data: Partial<ChargingStation>): Promise<ApiResponse<ChargingStation>> => {
    return api.post('/charging-stations', data)
  },
  
  updateStation: (id: string, data: Partial<ChargingStation>): Promise<ApiResponse<ChargingStation>> => {
    return api.put(`/charging-stations/${id}`, data)
  },
  
  deleteStation: (id: string): Promise<ApiResponse<null>> => {
    return api.delete(`/charging-stations/${id}`)
  }
}

// Path planning API
export const pathAPI = {
  planPath: (droneId: string, targetId: string): Promise<ApiResponse<any>> => {
    return api.post('/path/plan', { droneId, targetId })
  },
  
  getChargingPath: (droneId: string): Promise<ApiResponse<any>> => {
    return api.post('/path/charging', { droneId })
  },
  
  executePath: (pathId: string): Promise<ApiResponse<null>> => {
    return api.post(`/path/${pathId}/execute`)
  }
}

// Operation API
export const operationAPI = {
  getOperations: (): Promise<ApiResponse<DroneOperation[]>> => {
    return api.get('/operations')
  },
  
  getOperation: (id: string): Promise<ApiResponse<DroneOperation>> => {
    return api.get(`/operations/${id}`)
  },
  
  createOperation: (data: Partial<DroneOperation>): Promise<ApiResponse<DroneOperation>> => {
    return api.post('/operations', data)
  },
  
  updateOperation: (id: string, data: Partial<DroneOperation>): Promise<ApiResponse<DroneOperation>> => {
    return api.put(`/operations/${id}`, data)
  },
  
  deleteOperation: (id: string): Promise<ApiResponse<null>> => {
    return api.delete(`/operations/${id}`)
  }
}

// AI assistant API
export const aiAPI = {
  chat: (question: string, context?: string): Promise<ApiResponse<AIChat>> => {
    return api.post('/ai/chat', { question, context })
  },
  
  getHistory: (): Promise<ApiResponse<AIChat[]>> => {
    return api.get('/ai/history')
  },
  
  clearHistory: (): Promise<ApiResponse<null>> => {
    return api.delete('/ai/history')
  }
}


// YOLO detection API
export const yoloAPI = {
  detect: (
    task: YoloTask,
    imageBase64: string,
    options?: { filename?: string; conf?: number; imgsz?: number }
  ): Promise<ApiResponse<YoloDetectionResult>> => {
    return api.post('/yolo/detect', {
      task,
      imageBase64,
      filename: options?.filename,
      conf: options?.conf,
      imgsz: options?.imgsz
    })
  },
  detectVideo: (
    task: YoloTask,
    video: File,
    options?: { conf?: number; imgsz?: number; iou?: number; augment?: string }
  ): Promise<ApiResponse<YoloVideoDetectionResult>> => {
    const formData = new FormData()
    formData.append('task', task)
    formData.append('video', video)
    if (options?.conf !== undefined) formData.append('conf', String(options.conf))
    if (options?.imgsz !== undefined) formData.append('imgsz', String(options.imgsz))
    if (options?.iou !== undefined) formData.append('iou', String(options.iou))
    if (options?.augment !== undefined) formData.append('augment', options.augment)

    return api.post('/yolo/detect-video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 600000
    })
  }
}

// Dashboard API
export const dashboardAPI = {
  getDashboardData: (): Promise<ApiResponse<any>> => {
    return api.get('/dashboard')
  },
  
  getRealtimeData: (): Promise<ApiResponse<any>> => {
    return api.get('/dashboard/realtime')
  }
}

// WebSocket connection
export const websocketAPI = {
  connect: (onMessage: (data: any) => void): WebSocket => {
    const ws = new WebSocket(`ws://${window.location.host}/ws`)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      onMessage(data)
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    return ws
  }
}

export default api


