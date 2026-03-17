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
                <el-button size="small" type="primary" @click="startDispatchSelect" :disabled="!mapInitialized || missionRunning">
                  {{ selectingDispatch ? '请点击地图...' : '选择派发点' }}
                </el-button>
                <el-button size="small" type="primary" plain @click="startSprayDrawing" :disabled="!mapInitialized || sprayDrawing">圈选喷洒区</el-button>
                <el-button size="small" type="success" plain @click="regenerateSprayPath" :disabled="sprayPolygonPoints.length < 3">喷洒轨迹</el-button>
                <el-button size="small" type="primary" plain @click="openTargetModalFromPlan" :disabled="!sprayPlanResult">新增作业目标</el-button>
                <el-button size="small" type="success" @click="executeDispatchMission" :disabled="!canExecuteMission">执行派发任务</el-button>
                <el-button size="small" @click="pauseMission" :disabled="!missionRunning">暂停任务</el-button>
                <el-button size="small" @click="resumeMission" :disabled="!missionPaused">继续任务</el-button>
                <el-button size="small" type="warning" @click="stopMission" :disabled="!missionRunning && !missionPaused">结束任务</el-button>
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
            <div class="flight-stats">
              <span>派发点: {{ dispatchTargetText }}</span>
              <span>任务状态: {{ missionStatusText }}</span>
              <span>任务里程: {{ missionDistanceKm.toFixed(2) }} km</span>
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
              <TargetCard v-for="target in targets" :key="target.id" :target="target" @complete="handleCompleteTarget" />
            </div>
          </el-scrollbar>
          <el-empty v-else description="暂无作业目标">
            <el-button type="primary" @click="showTargetModal = true">创建目标</el-button>
          </el-empty>
        </el-card>

        <el-card class="panel-card">
          <template #header>
            <div class="panel-head">
              <h2 class="section-title">用户列表</h2>
              <el-button size="small" @click="fetchUsers">刷新</el-button>
            </div>
          </template>

          <el-table :data="users" size="small" stripe>
            <el-table-column prop="name" label="姓名" min-width="92" />
            <el-table-column prop="username" label="用户名" min-width="102" />
            <el-table-column prop="role" label="角色" min-width="92" />
          </el-table>
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

    <AIChatWindow />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useDroneStore } from '@/store/drone'
import { useEnvironmentStore } from '@/store/environment'
import { useAIStore } from '@/store/ai'
import { authAPI, targetAPI } from '@/api'
import { ElMessage } from 'element-plus'
import type { WorkTarget, UserInfo, ChargingStation } from '@/types'
import AIChatWindow from '@/components/AIChatWindow.vue'
import TargetCard from '@/components/TargetCard.vue'
import YoloDetectionPanel from '@/components/YoloDetectionPanel.vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useDrone } from '@/composables/useDrone'
import { usePath } from '@/composables/usePath'
import { useSprayMissionMap } from '@/composables/useSprayMissionMap'
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
let mapClickListener: ((event: any) => void) | null = null
let dispatchMarker: any = null
let missionSprayStartIndex = 0
let missionStartBattery = 100
const sprayCircles: any[] = []

const {
  droneState,
  droneMarker,
  initDrone,
  takeoff: droneTakeoff,
  land: droneLand,
  updateAltitude,
  updateSpeed: updateDroneSpeed,
  updatePosition
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
const users = ref<UserInfo[]>([])
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

const speedValue = ref(6)
const heightValue = ref(8)
const mapInitialized = ref(false)
const selectingDispatch = ref(false)
const dispatchTarget = ref<[number, number] | null>(null)
const missionRunning = ref(false)
const missionPaused = ref(false)
const missionSpraying = ref(false)
const activeMissionTargetId = ref<string | null>(null)
const MU_TO_M2 = 666.6667

sprayParams.value.speed = speedValue.value
sprayParams.value.altitude = heightValue.value

const plannedAreaMu = computed(() => Number((sprayStats.value.areaM2 / MU_TO_M2).toFixed(2)))

const calculatedPesticide = computed(() =>
  Number((Math.max(0, newTarget.value.area) * Math.max(0.01, pesticidePerMu.value)).toFixed(2))
)

const selectedDrone = computed(() => {
  if (!selectedDroneId.value) return null
  return droneStore.drones.find(d => d.id === selectedDroneId.value) || null
})

const canExecuteMission = computed(() => {
  return Boolean(selectedDrone.value && dispatchTarget.value && sprayPlanResult.value && !missionRunning.value)
})

const dispatchTargetText = computed(() => {
  if (!dispatchTarget.value) return '未设置'
  return `${dispatchTarget.value[1].toFixed(5)}, ${dispatchTarget.value[0].toFixed(5)}`
})

const missionDistanceKm = computed(() => Number(pathStats.totalDistance || 0))

const missionStatusText = computed(() => {
  if (missionPaused.value) return '已暂停'
  if (missionRunning.value) return missionSpraying.value ? '喷洒中' : '派发飞行中'
  return '待命'
})

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

const setDispatchTarget = (point: [number, number]) => {
  dispatchTarget.value = point
  if (!map || !AMap) return

  if (!dispatchMarker) {
    dispatchMarker = new AMap.Marker({
      position: point,
      content:
        '<div style="width:16px;height:16px;border-radius:999px;background:#f97316;border:2px solid #fff;box-shadow:0 0 8px rgba(249,115,22,.5);"></div>',
      offset: new AMap.Pixel(-8, -8),
      title: '派发目标点'
    })
    map.add(dispatchMarker)
  } else {
    dispatchMarker.setPosition(point)
  }
}

const syncDronePositionToMap = () => {
  if (!selectedDrone.value || !map) return
  const pos: [number, number] = [selectedDrone.value.position.lng, selectedDrone.value.position.lat]
  map.setCenter(pos)
  updatePosition(pos)
}

const buildMissionPath = (): [number, number][] => {
  const path: [number, number][] = []
  const currentPos: [number, number] = selectedDrone.value
    ? [selectedDrone.value.position.lng, selectedDrone.value.position.lat]
    : [116.397428, 39.90923]

  path.push(currentPos)
  if (dispatchTarget.value) {
    path.push(dispatchTarget.value)
  }

  const sprayPath = sprayPlanResult.value?.path || []
  const sprayStartPoint = sprayPath[0]
  if (sprayStartPoint) {
    path.push(sprayStartPoint)
  }
  path.push(...sprayPath)

  const deduped: [number, number][] = []
  for (const point of path) {
    const last = deduped[deduped.length - 1]
    if (!last || last[0] !== point[0] || last[1] !== point[1]) {
      deduped.push(point)
    }
  }

  missionSprayStartIndex = sprayStartPoint
    ? Math.max(0, deduped.findIndex(p => p[0] === sprayStartPoint[0] && p[1] === sprayStartPoint[1]))
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
    }
  }
  ElMessage.success('派发喷洒任务已完成，无人机已降落')
}

const handleMissionMove = () => {
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
}

const handleMissionPause = async () => {
  if (!pathNavigator.value?.isCursorAtPathEnd?.()) return
  await finishMission()
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
    mapClickListener = (event: any) => {
      if (!selectingDispatch.value) return
      const point: [number, number] = [event.lnglat.getLng(), event.lnglat.getLat()]
      setDispatchTarget(point)
      selectingDispatch.value = false
      ElMessage.success('派发目标点已设置')
    }
    map.on('click', mapClickListener)
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

  if (dispatchMarker) {
    dispatchMarker.setMap(null)
    dispatchMarker = null
  }

  if (map) {
    if (mapClickListener) {
      map.off('click', mapClickListener)
      mapClickListener = null
    }
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

const startDispatchSelect = () => {
  if (!mapInitialized.value) return
  selectingDispatch.value = true
  ElMessage.info('请在地图上点击无人机派发目标点')
}

const startSprayDrawing = () => {
  selectingDispatch.value = false
  startSprayDrawingInternal()
}

const regenerateSprayPath = () => {
  regenerateSprayPathInternal()
  if (sprayPlanResult.value?.path?.length) {
    ElMessage.success('喷洒轨迹已生成，可执行派发任务（执行时自动创建作业目标）')
  }
}

const openTargetModalFromPlan = () => {
  if (!sprayPlanResult.value) {
    ElMessage.warning('请先完成喷洒轨迹规划')
    return
  }

  const areaMu = plannedAreaMu.value
  const pesticide = Number((areaMu * pesticidePerMu.value).toFixed(2))
  const now = new Date()
  const missionName = `喷洒作业-${now.getMonth() + 1}${now.getDate()}-${now.getHours()}${now.getMinutes()}`

  newTarget.value = {
    name: newTarget.value.name || missionName,
    area: areaMu > 0 ? areaMu : newTarget.value.area,
    status: 'pending'
  }

  if (pesticide > 0) {
    ElMessage.info(`已按面积自动估算用药量：${pesticide} L`)
  }
  showTargetModal.value = true
}

const executeDispatchMission = async () => {
  if (!selectedDrone.value) {
    ElMessage.warning('请先选择无人机')
    return
  }
  if (!dispatchTarget.value) {
    ElMessage.warning('请先设置派发目标点')
    return
  }
  if (!sprayPlanResult.value || sprayPlanResult.value.path.length < 2) {
    ElMessage.warning('请先生成有效喷洒轨迹')
    return
  }

  if (plannedAreaMu.value <= 0 || calculatedPesticide.value <= 0) {
    ElMessage.warning('喷洒面积或用药量无效，请重新规划喷洒区')
    return
  }

  const now = new Date()
  const autoTargetName = `自动喷洒任务-${now.getMonth() + 1}${now.getDate()}-${now.getHours()}${now.getMinutes()}`
  try {
    const targetResponse = await targetAPI.createTarget({
      name: autoTargetName,
      area: plannedAreaMu.value,
      pesticide: calculatedPesticide.value,
      status: 'in-progress',
      location: { lat: 39.90923, lng: 116.397428 }
    })

    if (!targetResponse.code || !targetResponse.data?.id) {
      ElMessage.error('自动创建作业目标失败，任务未开始')
      return
    }
    activeMissionTargetId.value = targetResponse.data.id
    await fetchTargets()
  } catch (error) {
    ElMessage.error('自动创建作业目标失败，任务未开始')
    return
  }

  const missionPath = buildMissionPath()
  if (missionPath.length < 2) {
    ElMessage.warning('任务路径不足，无法执行')
    activeMissionTargetId.value = null
    return
  }

  applyMissionPathToMap(missionPath)
  clearSprayCircles()
  stopNavigation()

  missionRunning.value = true
  missionPaused.value = false
  missionSpraying.value = false

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

  pathNavigator.value.on('move', handleMissionMove)
  pathNavigator.value.on('pause', handleMissionPause)
  startNavigation()
  ElMessage.success('派发任务已开始执行')
}

const pauseMission = () => {
  if (!missionRunning.value) return
  pauseNavigation()
  missionRunning.value = false
  missionPaused.value = true
  ElMessage.info('任务已暂停')
}

const resumeMission = () => {
  if (!missionPaused.value) return
  startNavigation()
  missionPaused.value = false
  missionRunning.value = true
  ElMessage.success('任务继续执行')
}

const stopMission = async () => {
  stopNavigation()
  stopMissionIntervals()
  clearSprayCircles()
  activeMissionTargetId.value = null
  droneMarker.value?.show?.()
  await droneLand()
  if (selectedDrone.value) {
    selectedDrone.value.status = 'online'
  }
  ElMessage.info('任务已结束')
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
    fetchUsers(),
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
})

const simulateSprayPath = () => {
  simulateSprayPathInternal()
}

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

const fetchUsers = async () => {
  try {
    const response = await authAPI.getUsers()
    if (response.code && response.data) {
      users.value = response.data
    }
  } catch (error) {
    users.value = []
  }
}

const fetchTargets = async () => {
  try {
    const response = await targetAPI.getTargets()
    if (response.code && response.data) {
      targets.value = response.data
    }
  } catch (error) {
    targets.value = []
  }
}

const refreshTargets = async () => {
  await fetchTargets()
}

const addTarget = async () => {
  if (!newTarget.value.name || newTarget.value.area <= 0 || calculatedPesticide.value <= 0) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  try {
    const response = await targetAPI.createTarget({
      name: newTarget.value.name,
      area: newTarget.value.area,
      pesticide: calculatedPesticide.value,
      status: newTarget.value.status,
      location: { lat: 39.90923, lng: 116.397428 }
    })
    
    if (response.code) {
      showTargetModal.value = false
      newTarget.value = { name: '', area: 0, status: 'pending' }
      await fetchTargets()
      ElMessage.success('作业目标添加成功')
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



