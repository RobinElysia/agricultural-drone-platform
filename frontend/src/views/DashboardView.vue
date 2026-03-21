<template>
  <div class="page-shell dashboard-page">
    <header class="dashboard-topbar dark-card">
      <div class="title-wrap">
        <p class="kicker">Mission Control</p>
        <h1>农业无人机平台</h1>
      </div>
      <div class="topbar-actions">
        <div class="user-pill" v-if="userStore.user">
          {{ userStore.userName }} / {{ userStore.userRole }}
        </div>
        <el-button type="primary" @click="toggleAIChat">AI 助手</el-button>
        <el-button type="danger" plain @click="handleLogout">退出登录</el-button>
      </div>
    </header>

    <section class="dashboard-grid">
      <aside class="column column-left">
        <el-card class="panel-card target-panel">
          <template #header>
            <div class="panel-head">
              <h2 class="section-title">无人机状态</h2>
              <div class="inline-actions">
                <el-button size="small" type="primary" @click="showDroneModal = true">新增</el-button>
                <el-button size="small" @click="refreshDrones">刷新</el-button>
              </div>
            </div>
          </template>

          <div v-if="selectedDrone" class="metric-list">
            <div class="metric-row"><span>名称</span><strong>{{ selectedDrone.name }}</strong></div>
            <div class="metric-row battery-row">
              <span>电量</span>
              <el-progress
                :percentage="selectedDrone.battery"
                :color="getBatteryColor(selectedDrone.battery)"
                :show-text="true"
                :format="formatBatteryPercentage"
              />
            </div>
            <div class="metric-row"><span>电机转速</span><strong>{{ selectedDrone.motorSpeed }} RPM</strong></div>
            <div class="metric-row"><span>载药量</span><strong>{{ selectedDrone.load }} L</strong></div>
            <div class="metric-row"><span>状态</span><el-tag :type="getDroneStatusType(selectedDrone.status)">{{ selectedDrone.status }}</el-tag></div>
            <div class="metric-row"><span>位置</span><strong>{{ selectedDrone.position.lat.toFixed(4) }}, {{ selectedDrone.position.lng.toFixed(4) }}</strong></div>
            <div class="metric-row distance-row">
              <span>本次控制</span>
              <strong>{{ manualSessionDistance.toFixed(1) }} m</strong>
            </div>
            <div class="metric-row distance-row">
              <span>累计移动</span>
              <strong>{{ manualTotalDistance.toFixed(1) }} m</strong>
            </div>

            <el-form-item label="选择无人机" class="picker-row">
              <el-select v-model="selectedDroneId" @change="onDroneSelect" placeholder="请选择无人机">
                <el-option v-for="drone in droneStore.drones" :key="drone.id" :label="drone.name + ' (' + drone.status + ')'" :value="drone.id" />
              </el-select>
            </el-form-item>

            <div class="inline-actions">
              <el-button @click="editSelectedDrone">编辑</el-button>
              <el-button type="danger" plain @click="deleteSelectedDrone">删除</el-button>
            </div>
          </div>

          <el-empty v-else description="暂无无人机数据">
            <el-button type="primary" @click="showDroneModal = true">立即新增</el-button>
          </el-empty>

          <div class="stat-grid">
            <div class="stat-item"><p>总数</p><strong>{{ droneStore.totalDrones }}</strong></div>
            <div class="stat-item"><p>在线</p><strong>{{ droneStore.onlineDrones.length }}</strong></div>
            <div class="stat-item"><p>飞行中</p><strong>{{ droneStore.flyingDrones.length }}</strong></div>
            <div class="stat-item"><p>平均电量</p><strong>{{ droneStore.avgBattery }}%</strong></div>
          </div>
        </el-card>

        <el-card class="panel-card">
          <template #header>
            <div class="panel-head">
              <h2 class="section-title">环境信息</h2>
              <el-button size="small" @click="environmentStore.fetchEnvironment()">刷新</el-button>
            </div>
          </template>

          <div v-if="environmentStore.environment" class="metric-list">
            <div class="metric-row"><span>温度</span><strong>{{ environmentStore.temperature }}°C</strong></div>
            <div class="metric-row"><span>天气</span><strong>{{ environmentStore.weather }}</strong></div>
            <div class="metric-row"><span>风向</span><strong>{{ environmentStore.windDirection || '未知' }}</strong></div>
            <div class="metric-row"><span>风级</span><el-tag :type="getWindLevelType(environmentStore.windLevel)">{{ environmentStore.windLevel }} 级</el-tag></div>
            <div class="metric-row"><span>湿度</span><strong>{{ environmentStore.humidity }}%</strong></div>
            <el-alert :title="environmentStore.flightStatus.message" :type="getFlightStatusType(environmentStore.flightStatus.status)" :closable="false" />
          </div>
          <el-empty v-else description="正在获取环境数据" />
        </el-card>

      </aside>

      <main class="column column-center">
        <el-card class="panel-card map-card">
          <template #header>
            <div class="panel-head">
              <h2 class="section-title">实时地图与飞行控制</h2>
              <div class="inline-actions">
                <el-button size="small" type="primary" plain @click="startSprayDrawing" :disabled="!mapInitialized || sprayDrawing">圈选喷洒区</el-button>
                <el-button size="small" type="success" plain @click="regenerateSprayPath" :disabled="sprayPolygonPoints.length < 3">喷洒轨迹</el-button>
                <el-button size="small" type="primary" plain @click="openTargetModalFromPlan" :disabled="!sprayPlanResult">新增作业目标</el-button>
                <el-button size="small" type="success" plain @click="handleStartMissionButton" :disabled="!missionReady">开始任务</el-button>
                <el-button size="small" type="warning" plain @click="pauseMission" :disabled="!missionRunning">暂停任务</el-button>
                <el-button size="small" type="info" plain @click="resumeMission" :disabled="!missionPaused">继续任务</el-button>
                <el-button size="small" type="danger" plain @click="finishMission" :disabled="!(missionStatus === 'running' || missionStatus === 'paused')">结束任务</el-button>
                <el-button size="small" type="warning" plain @click="simulateSprayPath" :disabled="!sprayPlanResult || missionRunning">喷洒模拟</el-button>
                <el-button size="small" plain @click="exportSprayMission" :disabled="!sprayPlanResult">导出喷洒</el-button>
              </div>
            </div>
          </template>

          <div ref="mapRef" class="map-board"></div>

          <section class="flight-strip">
            <div class="flight-stats">
              <span>喷洒面积: {{ sprayStats.areaM2.toFixed(0) }} ㎡</span>
              <span>喷洒航线: {{ sprayStats.distanceM.toFixed(0) }} m</span>
              <span>喷洒航点: {{ sprayStats.waypointCount }}</span>
              <span>线间距: {{ sprayLineSpacing.toFixed(2) }} m</span>
            </div>
            <div class="flight-stats mission-status-panel">
              <span>任务状态: {{ missionStatusText }}</span>
              <span>当前目标: {{ currentMissionTargetName }}</span>
              <span>任务进度: {{ missionProgress.toFixed(1) }}%</span>
            </div>
            <div class="slider-group">
              <label>喷洒速度 (m/s)</label>
              <el-slider v-model="speedValue" @input="onSpeedChange" :min="1" :max="15" />
              <label>喷洒高度 (m)</label>
              <el-slider v-model="heightValue" @input="onHeightChange" :min="2" :max="120" />
            </div>
          </section>
        </el-card>
      </main>

      <aside class="column column-right">
        <el-card class="panel-card">
          <template #header>
            <div class="panel-head">
              <h2 class="section-title">作业目标</h2>
              <div class="inline-actions">
                <el-button size="small" @click="refreshTargets">刷新</el-button>
                <el-button size="small" type="primary" @click="showTargetModal = true">新增</el-button>
              </div>
            </div>
          </template>

          <el-scrollbar v-if="targets.length > 0" class="targets-scrollbar">
            <div class="targets-list">
              <TargetCard
                v-for="target in targets"
                :key="target.id"
                :target="target"
                @complete="handleCompleteTarget"
                @deleteTarget="handleDeleteTarget"
              />
            </div>
          </el-scrollbar>
          <el-empty v-else description="暂无作业目标">
            <el-button type="primary" @click="showTargetModal = true">创建目标</el-button>
          </el-empty>
        </el-card>

      <el-card class="panel-card">
        <template #header>
          <div class="panel-head">
            <h2 class="section-title">图像识别</h2>
          </div>
          </template>
          <YoloDetectionPanel />
        </el-card>
      </aside>
    </section>

    <el-dialog v-model="showDroneModal" :title="editingDrone ? '编辑无人机' : '新增无人机'" width="520px">
      <el-form :model="droneForm" label-width="92px">
        <el-form-item label="名称"><el-input v-model="droneForm.name" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="droneForm.status">
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
            <el-option label="充电中" value="charging" />
            <el-option label="飞行中" value="flying" />
          </el-select>
        </el-form-item>
        <el-form-item label="电量(%)"><el-input-number v-model="droneForm.battery" :min="0" :max="100" /></el-form-item>
        <el-form-item label="电机转速"><el-input-number v-model="droneForm.motorSpeed" :min="0" /></el-form-item>
        <el-form-item label="载药量(L)"><el-input-number v-model="droneForm.load" :min="0" /></el-form-item>
        <el-form-item label="纬度"><el-input-number v-model="droneForm.lat" :step="0.0001" /></el-form-item>
        <el-form-item label="经度"><el-input-number v-model="droneForm.lng" :step="0.0001" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDroneModal = false">取消</el-button>
        <el-button type="primary" @click="saveDroneForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showTargetModal" title="新增作业目标" width="520px">
      <el-form :model="newTarget" label-width="92px">
        <el-form-item label="目标名称"><el-input v-model="newTarget.name" /></el-form-item>
        <el-form-item label="面积(亩)"><el-input-number v-model="newTarget.area" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="每亩药量(L)">
          <el-input-number v-model="pesticidePerMu" :min="0.01" :step="0.01" :precision="2" />
          <div class="form-helper">常规水稻杀虫剂建议约 0.08-0.12 L/亩，可按实际药剂标签调整</div>
        </el-form-item>
        <el-form-item label="农药量(L)">
          <el-input-number :model-value="calculatedPesticide" :precision="2" :min="0" :controls="false" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTargetModal = false">取消</el-button>
        <el-button type="primary" @click="addTarget">创建</el-button>
      </template>
    </el-dialog>

    <DroneControlFloating
      :manual-session-distance="manualSessionDistance"
      :manual-total-distance="manualTotalDistance"
      @start-move="startManualMovement"
      @rotate="rotateDroneByDirection"
      @stop-move="stopManualMovement"
      @takeoff="handleTakeoffCommand"
      @landing="handleLandingCommand"
    />
    <AIChatWindow />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useDroneStore } from '@/store/drone'
import { useEnvironmentStore } from '@/store/environment'
import { useAIStore } from '@/store/ai'
import { targetAPI } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import type {
  WorkTarget,
  ChargingStation,
  DroneMoveDirection,
  DroneRotateDirection,
  DroneStatus
} from '@/types'
import AIChatWindow from '@/components/AIChatWindow.vue'
import DroneControlFloating from '@/components/DroneControlFloating.vue'
import TargetCard from '@/components/TargetCard.vue'
import YoloDetectionPanel from '@/components/YoloDetectionPanel.vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useDrone } from '@/composables/useDrone'
import { usePath } from '@/composables/usePath'
import { useSprayMissionMap } from '@/composables/useSprayMissionMap'
import { type LngLat } from '@/composables/useSprayPathPlanner'
import { calculateDistance } from '@/utils/geo'

const router = useRouter()
const userStore = useUserStore()
const droneStore = useDroneStore()
const environmentStore = useEnvironmentStore()
const aiStore = useAIStore()

const mapRef = ref<HTMLDivElement>()
let map: any = null
let AMap: any = null
let AMapUI: any = null
let missionSprayStartIndex = 0
let missionStartBattery = 100
const sprayCircles: any[] = []

const MOVE_STEP_METERS = 10
const ROTATE_STEP_DEGREES = 20
const TAKEOFF_TARGET_ALTITUDE = 10
const ALTITUDE_STEP_METERS = 0.8

type FlightStatusType = 'idle' | 'taking_off' | 'flying' | 'landing'

const flightInfo = reactive({
  status: 'idle' as FlightStatusType,
  totalDistance: 0,
  forwardDistance: 0,
  lateralDistance: 0,
  takeoffCount: 0,
  landingCount: 0
})

let takeoffInterval: number | null = null
let landingInterval: number | null = null

const {
  droneState,
  droneMarker,
  initDrone,
  takeoff: droneTakeoff,
  land: droneLand,
  updateAltitude,
  updateSpeed: updateDroneSpeed,
  updatePosition,
  updateHeading
} = useDrone()

const {
  pathPoints,
  pathNavigator,
  pathStats,
  initPathSimplifier,
  addWaypoint,
  clearPath: clearPathData,
  createNavigator,
  startNavigation,
  pauseNavigation,
  stopNavigation
} = usePath()

const sprayMission = useSprayMissionMap({ showPlanMarker: false })
const {
  drawing: sprayDrawing,
  polygonPoints: sprayPolygonPoints,
  planResult: sprayPlanResult,
  params: sprayParams,
  lineSpacing: sprayLineSpacing,
  sprayStats,
  startDrawing: startSprayDrawingInternal,
  generatePlan: regenerateSprayPathInternal,
  startSimulation: simulateSprayPathInternal,
  exportTask: exportSprayMissionInternal,
  mount: mountSprayMission,
  unmount: unmountSprayMission
} = sprayMission

const selectedDroneId = ref('')
const targets = ref<WorkTarget[]>([])
const chargingStations = ref<ChargingStation[]>([])
const showTargetModal = ref(false)
const showDroneModal = ref(false)
const editingDrone = ref<any>(null)
const newTarget = ref<{ name: string; area: number; status: 'pending' | 'in-progress' | 'completed' }>({
  name: '',
  area: 0,
  status: 'pending'
})
const pesticidePerMu = ref(0.1)
const droneForm = ref({
  name: '',
  status: 'online' as 'online' | 'offline' | 'charging' | 'flying',
  battery: 100,
  motorSpeed: 0,
  load: 10,
  lat: 39.9,
  lng: 116.4
})

const AUTO_CLEANUP_DELAY_MS = 5000
const pendingAutoCleanupIds = new Set<string>()
let autoCleanupTimer: number | null = null

const executeAutoCleanup = async (ids: string[]) => {
  if (!ids.length) return

  const targetsToCleanup = targets.value.filter(t => ids.includes(t.id))
  if (!targetsToCleanup.length) return

  const cleanupResults = await Promise.allSettled(
    targetsToCleanup.map(async (target) => {
      const response = await targetAPI.deleteTarget(target.id)
      return { id: target.id, success: !!response?.code }
    })
  )

  const cleanedIds = cleanupResults.reduce<string[]>((acc, result) => {
    if (result.status === 'fulfilled' && result.value.success) {
      acc.push(result.value.id)
    }
    return acc
  }, [])

  const failedIds = targetsToCleanup
    .map((target) => target.id)
    .filter((id) => !cleanedIds.includes(id))

  if (failedIds.length) {
    failedIds.forEach((id) => pendingAutoCleanupIds.add(id))
    startAutoCleanupTimer()
  }

  if (!cleanedIds.length) return

  targets.value = targets.value.filter((target) => !cleanedIds.includes(target.id))
  ElMessage.info(
    cleanedIds.length === 1 ? '已自动清理完成作业目标' : `已自动清理 ${cleanedIds.length} 个完成的作业目标`,
    { duration: 2000 }
  )
}

const startAutoCleanupTimer = () => {
  if (autoCleanupTimer !== null) return
  autoCleanupTimer = window.setTimeout(async () => {
    autoCleanupTimer = null
    const idsToCleanup = Array.from(pendingAutoCleanupIds)
    pendingAutoCleanupIds.clear()
    await executeAutoCleanup(idsToCleanup)
  }, AUTO_CLEANUP_DELAY_MS)
}

const queueAutoCleanupForCompleted = (target: WorkTarget) => {
  if (target.status !== 'completed') return
  if (pendingAutoCleanupIds.has(target.id)) return
  pendingAutoCleanupIds.add(target.id)
  startAutoCleanupTimer()
}

const scheduleAutoCleanupForTargets = (targetList: WorkTarget[]) => {
  targetList.forEach(queueAutoCleanupForCompleted)
}

const cancelAutoCleanupForTarget = (targetId: string): WorkTarget | undefined => {
  const removed = pendingAutoCleanupIds.delete(targetId)
  if (!removed) return undefined
  if (!pendingAutoCleanupIds.size && autoCleanupTimer !== null) {
    window.clearTimeout(autoCleanupTimer)
    autoCleanupTimer = null
  }
  return targets.value.find((target) => target.id === targetId)
}

const speedValue = ref(6)
const heightValue = ref(8)
const mapInitialized = ref(false)
const missionRunning = ref(false)
const missionPaused = ref(false)
const missionSpraying = ref(false)
const missionStatus = ref<'idle' | 'ready' | 'running' | 'paused' | 'finished'>('idle')
const missionProgress = ref(0)
const missionQueue = ref<WorkTarget[]>([])
const currentMissionTarget = ref<WorkTarget | null>(null)
const currentMissionPolygon = ref<LngLat[]>([])
const activeMissionTargetId = ref<string | null>(null)
const manualSessionDistance = ref(0)
const manualTotalDistance = ref(0)
const manualSessionActive = ref(false)
const MU_TO_M2 = 666.6667
const MANUAL_MOVE_INTERVAL_MS = 180
const manualMoveDirection = ref<DroneMoveDirection | null>(null)
const manualMoveTimer = ref<number | null>(null)

sprayParams.value.speed = speedValue.value
sprayParams.value.altitude = heightValue.value

const plannedAreaMu = computed(() => Number((sprayStats.value.areaM2 / MU_TO_M2).toFixed(2)))

const calculatedPesticide = computed(() =>
  Number((Math.max(0, newTarget.value.area) * Math.max(0.01, pesticidePerMu.value)).toFixed(2))
)

const deriveSprayPlanMetrics = (options?: { silent?: boolean; hint?: string }) => {
  const { silent = false, hint = '喷洒面积或用药量无效，请重新规划喷洒区' } = options ?? {}
  const plan = sprayPlanResult.value
  if (!plan || plan.path.length < 2) {
    if (!silent) ElMessage.warning('请先生成有效喷洒轨迹')
    return null
  }
  if (!plan.polygon || plan.polygon.length < 3) {
    if (!silent) ElMessage.warning('喷洒区域点数不足，请重新圈选')
    return null
  }
  const areaM2 = plan.areaM2 ?? sprayStats.value.areaM2
  if (!Number.isFinite(areaM2) || areaM2 <= 0) {
    if (!silent) ElMessage.warning(hint)
    return null
  }
  const areaMu = Number((areaM2 / MU_TO_M2).toFixed(2))
  if (!Number.isFinite(areaMu) || areaMu <= 0) {
    if (!silent) ElMessage.warning(hint)
    return null
  }
  const pesticide = Number((areaMu * pesticidePerMu.value).toFixed(2))
  if (!Number.isFinite(pesticide) || pesticide <= 0) {
    if (!silent) ElMessage.warning(hint)
    return null
  }
  return { areaMu, pesticide, polygon: plan.polygon }
}

const selectedDrone = computed(() => {
  if (!selectedDroneId.value) return null
  return droneStore.drones.find(d => d.id === selectedDroneId.value) || null
})

const activeMissionInfo = computed(() => {
  return currentMissionTarget.value || targets.value.find(target => target.id === activeMissionTargetId.value) || null
})

const currentMissionTargetName = computed(() => {
  return activeMissionInfo.value ? activeMissionInfo.value.name : '暂无目标'
})

const missionReady = computed(() => {
  return (
    Boolean(selectedDrone.value && sprayPlanResult.value && sprayPlanResult.value.path.length > 1) &&
    missionStatus.value !== 'running'
  )
})

const missionStatusText = computed(() => {
  switch (missionStatus.value) {
    case 'idle':
      return '待命'
    case 'ready':
      return '等待启动'
    case 'running':
      return missionSpraying.value ? '喷洒中' : '飞行中'
    case 'paused':
      return '已暂停'
    case 'finished':
      return '已完成'
    default:
      return '未知'
  }
})

const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360
const METERS_PER_DEGREE_LAT = 111320

const metersToLatDegrees = (meters: number) => meters / METERS_PER_DEGREE_LAT
const metersToLngDegrees = (meters: number, referenceLat: number) => {
  const radLat = (referenceLat * Math.PI) / 180
  const cosLat = Math.cos(radLat)
  if (cosLat === 0) return 0
  return meters / (METERS_PER_DEGREE_LAT * cosLat)
}

const getDemoDestination = (
  origin: [number, number],
  direction: DroneMoveDirection,
  distance = MOVE_STEP_METERS
): [number, number] => {
  const [lng, lat] = origin
  let latMeters = 0
  let lngMeters = 0

  switch (direction) {
    case 'forward':
      latMeters = distance
      break
    case 'backward':
      latMeters = -distance
      break
    case 'left':
      lngMeters = -distance
      break
    case 'right':
      lngMeters = distance
      break
  }

  const nextLat = lat + metersToLatDegrees(latMeters)
  const nextLng = lng + metersToLngDegrees(lngMeters, lat)
  return [nextLng, nextLat]
}

const addDistance = (value: number, forward = false, lateral = false) => {
  if (forward) {
    flightInfo.forwardDistance = Number((flightInfo.forwardDistance + value).toFixed(1))
  }
  if (lateral) {
    flightInfo.lateralDistance = Number((flightInfo.lateralDistance + value).toFixed(1))
  }
  flightInfo.totalDistance = Number((flightInfo.totalDistance + value).toFixed(1))
}

const canControlDrone = () => {
  return Boolean(selectedDrone.value && flightInfo.status === 'flying')
}

const startManualSession = () => {
  manualSessionDistance.value = 0
  manualSessionActive.value = true
}

const stopManualSession = () => {
  manualSessionActive.value = false
}

const updateMovementDistances = (direction: DroneMoveDirection, distance = MOVE_STEP_METERS) => {
  manualSessionDistance.value = Number((manualSessionDistance.value + distance).toFixed(1))
  manualTotalDistance.value = Number((manualTotalDistance.value + distance).toFixed(1))
  addDistance(distance, direction === 'forward', direction === 'left' || direction === 'right')
}

const clearManualMoveTimer = () => {
  if (manualMoveTimer.value !== null) {
    window.clearInterval(manualMoveTimer.value)
    manualMoveTimer.value = null
  }
  manualMoveDirection.value = null
}

const updateDronePositionLocally = (
  direction: DroneMoveDirection,
  distanceStep = MOVE_STEP_METERS,
  destination?: [number, number]
) => {
  if (!selectedDrone.value) return
  const origin =
    droneState.position ||
    [selectedDrone.value.position.lng, selectedDrone.value.position.lat]
  const nextPosition = destination ?? getDemoDestination(origin, direction, distanceStep)
  updatePosition(nextPosition)
  droneState.position = nextPosition
  selectedDrone.value = {
    ...selectedDrone.value,
    position: { lng: nextPosition[0], lat: nextPosition[1] }
  }
  map?.setCenter?.(nextPosition)
}

const sendMoveCommand = async ({
  droneId,
  direction,
  distanceStep = MOVE_STEP_METERS
}: {
  droneId: string
  direction: DroneMoveDirection
  distanceStep?: number
}) => {
  if (!selectedDrone.value || selectedDrone.value.id !== droneId) return false
  const origin =
    droneState.position ||
    [selectedDrone.value.position.lng, selectedDrone.value.position.lat]
  const destination = getDemoDestination(origin, direction, distanceStep)
  const targetParams = {
    position: { lat: destination[1], lng: destination[0] }
  }

  updateDronePositionLocally(direction, distanceStep, destination)
  updateMovementDistances(direction, distanceStep)

  try {
    await droneStore.controlDrone(droneId, 'move', targetParams)
  } catch (error) {
    console.warn('Manual move command failed, falling back to local simulation.', error)
  }

  return true
}

const executeManualMove = (direction: DroneMoveDirection) => {
  if (!canControlDrone() || !selectedDrone.value) {
    return
  }
  if (!manualSessionActive.value) {
    startManualSession()
  }
  void sendMoveCommand({
    droneId: selectedDrone.value.id,
    direction
  })
}

const startManualMovement = (direction: DroneMoveDirection) => {
  if (!canControlDrone()) {
    return
  }
  manualMoveDirection.value = direction
  executeManualMove(direction)

  if (manualMoveTimer.value === null) {
    manualMoveTimer.value = window.setInterval(() => {
      if (manualMoveDirection.value) {
        executeManualMove(manualMoveDirection.value)
      }
    }, MANUAL_MOVE_INTERVAL_MS)
  }
}

const stopManualMovement = async () => {
  clearManualMoveTimer()
  await handleStopMove()
}

const rotateDroneByDirection = async (direction: DroneRotateDirection) => {
  if (flightInfo.status !== 'flying' || !selectedDrone.value) {
    return
  }

  const currentHeading = normalizeAngle(droneState.heading || 0)
  const delta = direction === 'ccw' ? -ROTATE_STEP_DEGREES : ROTATE_STEP_DEGREES
  const nextHeading = normalizeAngle(currentHeading + delta)

  updateHeading(nextHeading)
  if (selectedDrone.value) {
    selectedDrone.value = {
      ...selectedDrone.value,
      heading: nextHeading
    }
  }

  try {
    const operation = await droneStore.controlDrone(selectedDrone.value.id, 'rotate', {
      heading: nextHeading
    })
    const updatedHeading = operation?.result?.drone?.heading
    if (typeof updatedHeading === 'number') {
      const normalizedHeading = normalizeAngle(updatedHeading)
      updateHeading(normalizedHeading)
      if (selectedDrone.value) {
        selectedDrone.value = {
          ...selectedDrone.value,
          heading: normalizedHeading
        }
      }
    }
  } catch (error) {
    console.warn('Rotation command failed, keeping demo heading.', error)
  }
}

const handleStopMove = async () => {
  const wasActive = manualSessionActive.value
  stopManualSession()
  if (!wasActive || !selectedDrone.value) return

  const currentPos =
    droneState.position || [selectedDrone.value.position.lng, selectedDrone.value.position.lat]
  const stopParams = {
    position: { lat: currentPos[1], lng: currentPos[0] }
  }

  const stopOperation = await droneStore.controlDrone(selectedDrone.value.id, 'move', stopParams)
  const updatedPosition = stopOperation?.result?.drone?.position || stopParams.position
  updatePosition([updatedPosition.lng, updatedPosition.lat])
  if (selectedDrone.value) {
    selectedDrone.value = {
      ...selectedDrone.value,
      position: updatedPosition
    }
  }
}

const clearTakeoffInterval = () => {
  if (takeoffInterval) {
    window.clearInterval(takeoffInterval)
    takeoffInterval = null
  }
}

const clearLandingInterval = () => {
  if (landingInterval) {
    window.clearInterval(landingInterval)
    landingInterval = null
  }
}

const handleTakeoffCommand = () => {
  if (flightInfo.status === 'taking_off' || flightInfo.status === 'flying') return
  clearLandingInterval()
  flightInfo.status = 'taking_off'
  droneState.status = 'taking_off'
  flightInfo.takeoffCount += 1
  ElMessage.success('起飞指令已发送')
  let currentAlt = droneState.altitude
  takeoffInterval = window.setInterval(() => {
    currentAlt = Math.min(currentAlt + ALTITUDE_STEP_METERS, TAKEOFF_TARGET_ALTITUDE)
    updateAltitude(currentAlt)
    if (currentAlt >= TAKEOFF_TARGET_ALTITUDE) {
      clearTakeoffInterval()
      flightInfo.status = 'flying'
      droneState.status = 'flying'
    }
  }, 80)
}

const handleLandingCommand = () => {
  if (flightInfo.status === 'landing' || flightInfo.status === 'idle') return
  clearTakeoffInterval()
  flightInfo.status = 'landing'
  droneState.status = 'landing'
  flightInfo.landingCount += 1
  ElMessage.success('降落指令已发送')
  let currentAlt = droneState.altitude
  landingInterval = window.setInterval(() => {
    currentAlt = Math.max(0, currentAlt - ALTITUDE_STEP_METERS)
    updateAltitude(currentAlt)
    if (currentAlt <= 0) {
      clearLandingInterval()
      flightInfo.status = 'idle'
      droneState.status = 'landed'
    }
  }, 80)
}

const clearSprayCircles = () => {
  sprayCircles.forEach(circle => circle?.setMap?.(null))
  sprayCircles.length = 0
}

const updatePathStats = () => {
  let totalDist = 0
  for (let i = 1; i < pathPoints.value.length; i++) {
    totalDist += calculateDistance(pathPoints.value[i - 1], pathPoints.value[i])
  }
  pathStats.totalDistance = totalDist
  pathStats.estimatedTime = speedValue.value > 0 ? (totalDist * 1000) / speedValue.value / 60 : 0
  pathStats.waypointCount = Math.max(0, pathPoints.value.length - 1)
}

const syncDronePositionToMap = () => {
  if (!selectedDrone.value || !map) return
  const pos: [number, number] = [selectedDrone.value.position.lng, selectedDrone.value.position.lat]
  map.setCenter(pos)
  updatePosition(pos)
}

const handleAreaSelected = (polygon: LngLat[]) => {
  currentMissionPolygon.value = polygon
  generateSprayPath(polygon)
}

const generateSprayPath = (areaPolygon?: LngLat[]) => {
  if (areaPolygon && areaPolygon.length >= 3) {
    sprayPolygonPoints.value = areaPolygon
  }
  regenerateSprayPathInternal()
  if (sprayPlanResult.value?.path?.length) {
    missionStatus.value = 'ready'
    missionProgress.value = 0
    missionSprayStartIndex = sprayPlanResult.value.path.length > 0 ? 1 : 0
  }
}

const buildMissionPath = (): [number, number][] => {
  const path: [number, number][] = []
  const currentPos: [number, number] = selectedDrone.value
    ? [selectedDrone.value.position.lng, selectedDrone.value.position.lat]
    : [116.397428, 39.90923]

  path.push(currentPos)
  const sprayPath = sprayPlanResult.value?.path || []
  path.push(...sprayPath)

  const deduped: [number, number][] = []
  for (const point of path) {
    const last = deduped[deduped.length - 1]
    if (!last || last[0] !== point[0] || last[1] !== point[1]) {
      deduped.push(point)
    }
  }

  const firstSprayPoint = sprayPath[0]
  missionSprayStartIndex = firstSprayPoint
    ? Math.max(0, deduped.findIndex(p => p[0] === firstSprayPoint[0] && p[1] === firstSprayPoint[1]))
    : deduped.length

  return deduped
}

const applyMissionPathToMap = (missionPath: [number, number][]) => {
  clearPathData(map)
  missionPath.forEach(point => addWaypoint(point, AMap, map))
  updatePathStats()
}

const stopMissionIntervals = () => {
  missionRunning.value = false
  missionPaused.value = false
  missionSpraying.value = false
}

const finishMission = async () => {
  stopMissionIntervals()
  missionStatus.value = 'finished'
  missionProgress.value = 100
  clearSprayCircles()
  stopNavigation()
  if (droneMarker.value) {
    droneMarker.value.show()
    const pos = pathNavigator.value?.getPosition?.()
    const lng = pos?.getLng?.()
    const lat = pos?.getLat?.()
    if (typeof lng === 'number' && typeof lat === 'number') {
      droneMarker.value.setPosition([lng, lat])
      if (selectedDrone.value) {
        selectedDrone.value.position = { lng, lat }
      }
    }
  }

  await droneLand()
  if (selectedDrone.value) {
    selectedDrone.value.status = 'online'
  }
  if (activeMissionTargetId.value) {
    try {
      const completeResponse = await targetAPI.completeTarget(activeMissionTargetId.value)
      if (completeResponse.code) {
        await fetchTargets()
      }
    } catch (error) {
      ElMessage.warning('任务已飞行完成，但作业目标状态更新失败，请手动刷新后重试')
    } finally {
      activeMissionTargetId.value = null
      currentMissionTarget.value = null
    }
  }
  ElMessage.success('任务已完成，无人机已降落')

  if (missionQueue.value.length) {
    setTimeout(() => {
      startNextMissionFromQueue()
    }, 600)
  } else {
    missionStatus.value = 'idle'
    missionProgress.value = 0
  }
}

const moveDroneToNextPathPoint = () => {
  if (!pathNavigator.value || !selectedDrone.value) return
  const pos = pathNavigator.value.getPosition?.()
  const lng = pos?.getLng?.()
  const lat = pos?.getLat?.()
  if (typeof lng === 'number' && typeof lat === 'number') {
    updatePosition([lng, lat])
    selectedDrone.value.position = { lng, lat }
  }

  const idx = pathNavigator.value.cursor?.idx || 0
  let dist = 0
  for (let i = 1; i <= idx && i < pathPoints.value.length; i++) {
    dist += calculateDistance(pathPoints.value[i - 1], pathPoints.value[i])
  }
  pathStats.flownDistance = dist

  const consumed = dist / 10
  const battery = Math.max(0, missionStartBattery - consumed)
  droneState.battery = battery
  selectedDrone.value.battery = battery

  missionSpraying.value = idx >= missionSprayStartIndex
  if (missionSpraying.value && map && AMap && typeof lng === 'number' && typeof lat === 'number') {
    const circle = new AMap.Circle({
      center: [lng, lat],
      radius: Math.max(1.2, sprayParams.value.sprayWidth / 2),
      strokeWeight: 0,
      fillColor: '#22c55e',
      fillOpacity: 0.2,
      zIndex: 120
    })
    circle.setMap(map)
    sprayCircles.push(circle)
    if (sprayCircles.length > 220) {
      const oldest = sprayCircles.shift()
      oldest?.setMap?.(null)
    }
  }
  const totalPoints = Math.max(1, pathPoints.value.length)
  const percent = ((idx + 1) / totalPoints) * 100
  missionProgress.value = Math.min(100, Number(percent.toFixed(1)))
}

const handleNavigatorPause = async () => {
  const cursor = pathNavigator.value?.cursor
  if (!cursor) return
  const atEnd = cursor?.idx >= Math.max(0, pathPoints.value.length - 1)
  if (atEnd) {
    await finishMission()
  }
}

const startNextMissionFromQueue = async () => {
  if (missionRunning.value || !sprayPlanResult.value?.path?.length) return
  if (!missionQueue.value.length) {
    missionStatus.value = 'ready'
    return
  }
  const nextTarget = missionQueue.value.shift()!
  await startMission(nextTarget)
}

const enqueueMissionTarget = (target: WorkTarget) => {
  missionQueue.value.push(target)
  if (!missionRunning.value) {
    startNextMissionFromQueue()
  }
}

const startMission = async (target: WorkTarget | null = null) => {
  if (missionRunning.value) {
    ElMessage.warning('任务正在执行，无法重复启动')
    return
  }
  if (!selectedDrone.value) {
    ElMessage.warning('请先选择无人机')
    return
  }
  if (!deriveSprayPlanMetrics()) return

  const missionPath = buildMissionPath()
  if (missionPath.length < 2) {
    ElMessage.warning('任务路径不足，无法执行')
    return
  }

  applyMissionPathToMap(missionPath)
  clearSprayCircles()
  stopNavigation()

  missionRunning.value = true
  missionPaused.value = false
  missionSpraying.value = false
  missionStatus.value = 'running'
  missionProgress.value = 0
  currentMissionTarget.value = target
  activeMissionTargetId.value = target?.id ?? null

  await droneTakeoff(heightValue.value)
  selectedDrone.value.status = 'flying'
  droneState.status = 'flying'
  missionStartBattery = selectedDrone.value.battery
  droneMarker.value?.hide?.()

  createNavigator(speedValue.value * 3.6)
  if (!pathNavigator.value) {
    missionRunning.value = false
    activeMissionTargetId.value = null
    ElMessage.error('任务导航器创建失败')
    return
  }

  pathNavigator.value.on('move', moveDroneToNextPathPoint)
  pathNavigator.value.on('pause', handleNavigatorPause)
  startNavigation()
  ElMessage.success('任务已开始执行')
}

const handleStartMissionButton = () => {
  if (!missionReady.value) {
    ElMessage.warning('请先准备喷洒轨迹')
    return
  }
  if (missionQueue.value.length) {
    startNextMissionFromQueue()
  } else {
    startMission()
  }
}

const initMapOnDashboard = async () => {
  if (mapInitialized.value || !mapRef.value) return
  
  try {
    const result = await AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY || '',
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.MouseTool'],
      AMapUI: {
        version: '1.1',
        plugins: ['misc/PathSimplifier']
      }
    })
    
    AMap = result
    const center = selectedDrone.value?.position 
      ? [selectedDrone.value.position.lng, selectedDrone.value.position.lat]
      : [116.397428, 39.90923]
    
    map = new AMap.Map(mapRef.value, {
      zoom: 14,
      center,
      viewMode: '2D',
      layers: [new AMap.TileLayer.Satellite()]
    })
    map.addControl(new AMap.Scale())
    map.addControl(new AMap.ToolBar({ position: 'LB' }))
    AMapUI = (window as any).AMapUI
    if (AMapUI?.PathSimplifier) {
      initPathSimplifier(AMapUI.PathSimplifier, map)
    }

    initDrone(map, AMap, selectedDrone.value?.battery || 100)
    updateAltitude(heightValue.value)
    updateDroneSpeed(speedValue.value * 3.6)

    mountSprayMission(map, AMap)
    mapInitialized.value = true
    ElMessage.success('地图加载完成')
  } catch (error) {
    console.error('地图加载失败:', error)
    ElMessage.error('地图加载失败')
  }
}

const destroyMapOnDashboard = () => {
  stopNavigation()
  clearSprayCircles()
  clearPathData(map)

  if (map) {
    unmountSprayMission()
    map.destroy()
    map = null
    mapInitialized.value = false
  }
}

const onSpeedChange = () => {
  sprayParams.value.speed = speedValue.value
  updateDroneSpeed(speedValue.value * 3.6)
  if (pathNavigator.value) {
    pathNavigator.value.setSpeed((speedValue.value * 3.6 * 1000) / 3600)
  }
}

const onHeightChange = () => {
  sprayParams.value.altitude = heightValue.value
  updateAltitude(heightValue.value)
}

const startSprayDrawing = () => {
  startSprayDrawingInternal()
}

const regenerateSprayPath = () => {
  generateSprayPath()
}

const openTargetModalFromPlan = () => {
  const metrics = deriveSprayPlanMetrics()
  if (!metrics) return
  const now = new Date()
  const missionName = `喷洒作业-${now.getMonth() + 1}${now.getDate()}-${now.getHours()}${now.getMinutes()}`

  newTarget.value = {
    name: newTarget.value.name || missionName,
    area: metrics.areaMu,
    status: 'pending'
  }

  if (metrics.pesticide > 0) {
    ElMessage.info(`已按面积自动估算用药量：${metrics.pesticide} L`)
  }
  showTargetModal.value = true
}

const pauseMission = () => {
  if (!missionRunning.value) return
  pauseNavigation()
  missionRunning.value = false
  missionPaused.value = true
  missionStatus.value = 'paused'
  ElMessage.info('任务已暂停')
}

const resumeMission = () => {
  if (!missionPaused.value) return
  startNavigation()
  missionPaused.value = false
  missionRunning.value = true
  missionStatus.value = 'running'
  ElMessage.success('任务继续执行')
}

onMounted(async () => {
  userStore.restoreState()
  
  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  environmentStore.startAutoRefresh()
  
  await Promise.all([
    droneStore.fetchDrones(),
    fetchTargets(),
    fetchChargingStations()
  ])
  
  if (droneStore.drones.length > 0) {
    selectedDroneId.value = droneStore.drones[0].id
  }
  
  await new Promise(resolve => setTimeout(resolve, 100))
  await initMapOnDashboard()
})

watch(selectedDroneId, (_newId) => {
  if (selectedDrone.value && mapInitialized.value && map) {
    map.setCenter([selectedDrone.value.position.lng, selectedDrone.value.position.lat])
    updatePosition([selectedDrone.value.position.lng, selectedDrone.value.position.lat])
  }
})

onUnmounted(() => {
  environmentStore.stopAutoRefresh()
  destroyMapOnDashboard()
  clearTakeoffInterval()
  clearLandingInterval()
  clearManualMoveTimer()
  if (autoCleanupTimer !== null) {
    window.clearTimeout(autoCleanupTimer)
    autoCleanupTimer = null
  }
  pendingAutoCleanupIds.clear()
})

const simulateSprayPath = () => {
  simulateSprayPathInternal()
}

sprayMission.setAreaSelectedHandler(handleAreaSelected)

const exportSprayMission = () => {
  exportSprayMissionInternal()
}

const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}

const onDroneSelect = () => {
  if (mapInitialized.value && map && selectedDrone.value) {
    map.setCenter([selectedDrone.value.position.lng, selectedDrone.value.position.lat])
    updatePosition([selectedDrone.value.position.lng, selectedDrone.value.position.lat])
  }
}

const fetchTargets = async () => {
  try {
    const response = await targetAPI.getTargets()
    if (response.code && response.data) {
      targets.value = response.data
      scheduleAutoCleanupForTargets(targets.value)
    }
  } catch (error) {
    targets.value = []
  }
}

const refreshTargets = async () => {
  await fetchTargets()
}

const addTarget = async () => {
  if (!newTarget.value.name) {
    ElMessage.warning('请填写目标名称')
    return
  }

  const metrics = deriveSprayPlanMetrics()
  if (!metrics) return

  const locationCandidate = metrics.polygon?.[0]
  const targetLocation = locationCandidate
    ? { lat: locationCandidate[1], lng: locationCandidate[0] }
    : { lat: 39.90923, lng: 116.397428 }

  try {
    const response = await targetAPI.createTarget({
      name: newTarget.value.name,
      area: metrics.areaMu,
      pesticide: metrics.pesticide,
      status: newTarget.value.status,
      location: targetLocation
    })
    
    if (response.code && response.data) {
      showTargetModal.value = false
      newTarget.value = { name: '', area: 0, status: 'pending' }
      await fetchTargets()
      enqueueMissionTarget(response.data)
      ElMessage.success('作业目标添加成功，已加入任务队列')
    }
  } catch (error) {
    ElMessage.error('添加作业目标失败')
  }
}

const handleCompleteTarget = async (targetId: string) => {
  try {
    const response = await targetAPI.completeTarget(targetId)
    if (response.code) {
      await fetchTargets()
      ElMessage.success('作业目标已完成')
    }
  } catch (error) {
    ElMessage.error('完成作业目标失败')
  }
}

const handleDeleteTarget = async (targetId: string) => {
  const pendingTarget = cancelAutoCleanupForTarget(targetId)
  try {
    await ElMessageBox.confirm('确认删除该作业目标吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    if (pendingTarget) {
      queueAutoCleanupForCompleted(pendingTarget)
    }
    return
  }

  try {
    const response = await targetAPI.deleteTarget(targetId)
    if (response.code) {
      await fetchTargets()
      ElMessage.success('已删除该作业目标')
      return
    }
    ElMessage.error(response.message || '删除失败')
  } catch (error) {
    ElMessage.error('删除作业目标失败')
  }
}

const fetchChargingStations = async () => {
  chargingStations.value = [
    { id: '1', name: '换电站 A', location: { lat: 39.905, lng: 116.405 }, status: 'available', capacity: 5 },
    { id: '2', name: '换电站 B', location: { lat: 39.915, lng: 116.415 }, status: 'occupied', capacity: 5 }
  ]
}

const refreshDrones = async () => {
  await droneStore.fetchDrones()
  if (selectedDroneId.value && !droneStore.drones.find(d => d.id === selectedDroneId.value)) {
    selectedDroneId.value = ''
  }
  if (!selectedDroneId.value && droneStore.drones.length > 0) {
    selectedDroneId.value = droneStore.drones[0].id
  }
}

const editSelectedDrone = () => {
  if (!selectedDrone.value) {
    ElMessage.warning('请先选择一架无人机')
    return
  }
  editingDrone.value = selectedDrone.value
  droneForm.value = {
    name: selectedDrone.value.name,
    status: selectedDrone.value.status,
    battery: selectedDrone.value.battery,
    motorSpeed: selectedDrone.value.motorSpeed,
    load: selectedDrone.value.load,
    lat: selectedDrone.value.position.lat,
    lng: selectedDrone.value.position.lng
  }
  showDroneModal.value = true
}

const deleteSelectedDrone = async () => {
  if (!selectedDrone.value) {
    ElMessage.warning('请先选择一架无人机')
    return
  }
  
  if (!confirm(`确定要删除无人机“${selectedDrone.value.name}”吗？此操作不可恢复。`)) {
    return
  }
  
  const success = await droneStore.deleteDrone(selectedDrone.value.id)
  if (success) {
    ElMessage.success('无人机删除成功')
    selectedDroneId.value = ''
    if (droneStore.drones.length > 0) {
      selectedDroneId.value = droneStore.drones[0].id
    }
  }
}

const saveDroneForm = async () => {
  if (editingDrone.value) {
    const success = await droneStore.updateDrone(editingDrone.value.id, {
      name: droneForm.value.name,
      battery: droneForm.value.battery,
      motorSpeed: droneForm.value.motorSpeed,
      load: droneForm.value.load,
      status: droneForm.value.status,
      position: { lat: droneForm.value.lat, lng: droneForm.value.lng }
    })
    
    if (success) {
      showDroneModal.value = false
      editingDrone.value = null
      await refreshDrones()
      ElMessage.success('无人机更新成功')
    }
  } else {
    const success = await droneStore.createDrone({
      name: droneForm.value.name,
      battery: droneForm.value.battery,
      motorSpeed: droneForm.value.motorSpeed,
      load: droneForm.value.load,
      status: droneForm.value.status,
      position: { lat: droneForm.value.lat, lng: droneForm.value.lng }
    })
    
    if (success) {
      showDroneModal.value = false
      await refreshDrones()
      ElMessage.success('无人机添加成功')
    }
  }
}

const toggleAIChat = () => {
  aiStore.toggleChat()
}

const getBatteryColor = (battery: number): string | string[] => {
  if (battery > 50) return '#67c23a'
  if (battery > 20) return '#e6a23c'
  return '#f56c6c'
}

const formatBatteryPercentage = (percentage: number) => `${percentage.toFixed(2)}%`

const getDroneStatusType = (status: string): string => {
  const map: Record<string, string> = {
    'online': 'success',
    'offline': 'danger',
    'charging': 'warning',
    'flying': 'info'
  }
  return map[status] || 'info'
}

const getWindLevelType = (level: number): string => {
  if (level <= 2) return 'success'
  if (level <= 4) return 'warning'
  return 'danger'
}

const getFlightStatusType = (status: string): string => {
  const map: Record<string, string> = {
    'danger': 'error',
    'warning': 'warning',
    'optimal': 'success',
    'good': 'success',
    'acceptable': 'info',
    'unknown': 'info'
  }
  return map[status] || 'info'
}
</script>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 14px;
}

.dashboard-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
}

.kicker {
  margin: 0;
  color: #99dab9;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
}

.title-wrap h1 {
  margin: 4px 0 0;
  font-size: 1.4rem;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-pill {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.83rem;
  color: #d6efdf;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(191, 231, 209, 0.25);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 320px minmax(540px, 1fr) 340px;
  gap: 14px;
  min-height: calc(100vh - 120px);
}

.column {
  min-height: 0;
}

.column-left,
.column-right {
  display: grid;
  gap: 14px;
  align-content: start;
}

.panel-card {
  border-radius: 16px;
}

.panel-card :deep(.el-card__header) {
  padding: 14px 16px;
  border-bottom: 1px solid #ecf0e8;
}

.panel-card :deep(.el-card__body) {
  padding: 14px 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.inline-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.metric-list {
  display: grid;
  gap: 10px;
}

.metric-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.metric-row span {
  color: var(--text-500);
}

.metric-row strong {
  color: var(--text-900);
  font-size: 0.92rem;
  font-weight: 700;
}

.distance-row strong {
  color: #0f172a;
}

.battery-row {
  align-items: stretch;
}

.battery-row :deep(.el-progress) {
  margin-top: 2px;
}

.picker-row {
  margin-top: 6px;
}

.stat-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.stat-item {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 10px;
}

.stat-item p {
  margin: 0;
  color: var(--text-500);
  font-size: 0.75rem;
}

.stat-item strong {
  display: block;
  margin-top: 4px;
  font-size: 1.05rem;
  color: var(--text-900);
}

.map-card {
  height: 100%;
  position: relative;
}

.map-card :deep(.el-card__body) {
  display: grid;
  grid-template-rows: minmax(420px, 1fr) auto;
  gap: 12px;
  height: calc(100% - 56px);
}

.map-board {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  border: 1px solid #dde6de;
  overflow: hidden;
  background: #fff;
}

.flight-strip {
  display: grid;
  gap: 10px;
  border-radius: 12px;
  background: var(--surface-2);
  padding: 10px;
}

.flight-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.82rem;
  color: var(--text-700);
}

.flight-stats.mission-status-panel {
  flex-direction: column;
  gap: 6px;
}

.flight-stats span {
  padding: 4px 8px;
  border-radius: 8px;
  background: #fff;
}

.slider-group {
  display: grid;
  gap: 6px;
}

.slider-group label {
  font-size: 0.78rem;
  color: var(--text-500);
}

.targets-list {
  display: grid;
  gap: 10px;
}

.target-panel :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: min(60vh, 700px);
}

.targets-scrollbar {
  flex: 1;
  min-height: 0;
}

:deep(.el-table) {
  border-radius: 10px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #edf2ea;
  margin-right: 0;
  padding: 14px 16px;
}

:deep(.el-dialog__body) {
  padding: 14px 16px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid #edf2ea;
  padding: 10px 16px 14px;
}

.form-helper {
  margin-top: 6px;
  color: var(--text-500);
  font-size: 0.75rem;
  line-height: 1.4;
}

@media (max-width: 1280px) {
  .dashboard-grid {
    grid-template-columns: 290px 1fr;
  }

  .column-right {
    grid-column: 1 / -1;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 940px) {
  .page-shell {
    padding: 12px;
  }

  .dashboard-topbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .column-right {
    grid-template-columns: 1fr;
  }

  .map-card :deep(.el-card__body) {
    grid-template-rows: 320px auto;
  }

  .target-panel :deep(.el-card__body) {
    max-height: min(52vh, 560px);
  }
}
</style>



