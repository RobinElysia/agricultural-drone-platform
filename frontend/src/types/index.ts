// User role type
export type UserRole = 'admin' | 'operator' | 'agriculturalist'

// Drone status type
export interface DroneStatus {
  id: string
  name: string
  battery: number // Battery percentage
  motorSpeed: number // Motor speed in RPM
  load: number // Payload in liters
  status: 'online' | 'offline' | 'charging' | 'flying'
  position: {
    lat: number
    lng: number
  }
  lastUpdate: string
}

// Environment info type
export interface EnvironmentInfo {
  temperature: number // Celsius
  weather: string // Weather condition
  windLevel: number // Wind level
  humidity: number // Humidity percentage
  windDirection?: string // Wind direction
  reportTime?: string // Report time
  timestamp: string
}

// Work target type
export interface WorkTarget {
  id: string
  name: string
  area: number // Area in mu
  pesticide: number // Pesticide amount in liters
  status: 'pending' | 'in-progress' | 'completed'
  location: {
    lat: number
    lng: number
  }
}

// User info type
export interface UserInfo {
  id: string
  username: string
  role: UserRole
  name: string
  email?: string
  phone?: string
  createdAt: string
}

// Charging station type
export interface ChargingStation {
  id: string
  name: string
  location: {
    lat: number
    lng: number
  }
  status: 'available' | 'occupied' | 'maintenance'
  capacity: number
}

// Path planning type
export interface PathPlan {
  id: string
  droneId: string
  targetId: string
  waypoints: Array<{
    lat: number
    lng: number
    order: number
  }>
  estimatedTime: number // Minutes
  distance: number // Meters
  status: 'planned' | 'in-progress' | 'completed'
}

// AI chat type
export interface AIChat {
  id: string
  question: string
  answer: string
  timestamp: string
  context?: string
}

// API response type
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

// Login request type
export interface LoginRequest {
  username: string
  password: string
  role: UserRole
}

// Login response type
export interface LoginResponse {
  token: string
  user: UserInfo
  expiresIn: number
}

// Drone operation type
export interface DroneOperation {
  id: string
  droneId: string
  type: 'takeoff' | 'land' | 'spray' | 'charge' | 'return'
  parameters?: Record<string, any>
  status: 'pending' | 'executing' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
}

// Realtime data type
export interface RealtimeData {
  type: 'drone_status' | 'environment' | 'operation' | 'alert'
  data: any
  timestamp: string
}

// Dashboard data type
export interface DashboardData {
  drones: DroneStatus[]
  environment: EnvironmentInfo
  targets: WorkTarget[]
  users: UserInfo[]
  chargingStations: ChargingStation[]
  activeOperations: DroneOperation[]
  alerts: Array<{
    id: string
    type: 'warning' | 'error' | 'info'
    message: string
    timestamp: string
  }>
}

export type DroneMoveDirection = 'forward' | 'backward' | 'left' | 'right'
export type DroneRotateDirection = 'ccw' | 'cw'

export type YoloTask = 'pest' | 'fire'

export interface YoloDetectionItem {
  label: string
  confidence: number
  xyxy: [number, number, number, number]
}

export interface YoloDetectionResult {
  ok: boolean
  task: YoloTask
  upload: string
  result: string
  result_url: string
  detections: YoloDetectionItem[]
  count: number
  conf: number
  imgsz?: number | null
}

export interface YoloVideoDetectionResult {
  success: boolean
  message: string
  task: YoloTask
  result_url: string
  upload_url?: string
  total_frames: number
  frames_with_detections: number
  total_detections: number
}
