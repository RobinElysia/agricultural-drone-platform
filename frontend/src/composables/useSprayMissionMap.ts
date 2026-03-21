import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  useSprayPathPlanner,
  type LngLat,
  type SprayPlanResult
} from '@/composables/useSprayPathPlanner'

export interface SprayMissionParams {
  lineHeading: number
  altitude: number
  speed: number
  sprayWidth: number
  overlapRatio: number
  gimbalPitch: number
}

interface UseSprayMissionMapOptions {
  showPlanMarker?: boolean
  onAreaSelected?: (polygon: LngLat[]) => void
}

export function useSprayMissionMap(options: UseSprayMissionMapOptions = {}) {
  const showPlanMarker = options.showPlanMarker ?? true
  const planner = useSprayPathPlanner()

  const drawing = ref(false)
  const simulating = ref(false)
  const polygonPoints = ref<LngLat[]>([])
  const planResult = ref<SprayPlanResult | null>(null)
  const params = ref<SprayMissionParams>({
    lineHeading: 0,
    altitude: 8,
    speed: 6,
    sprayWidth: 4,
    overlapRatio: 35,
    gimbalPitch: -45
  })

  const lineSpacing = computed(() => {
    const ratio = Math.min(90, Math.max(0, params.value.overlapRatio)) / 100
    return Math.max(0.8, params.value.sprayWidth * (1 - ratio))
  })

  const sprayStats = computed(() => {
    if (!planResult.value) {
      return {
        areaM2: 0,
        distanceM: 0,
        lineCount: 0,
        waypointCount: 0,
        estimateMinute: 0
      }
    }
    const distanceM = planResult.value.totalDistanceM
    const estimateMinute = params.value.speed > 0 ? distanceM / params.value.speed / 60 : 0
    return {
      areaM2: planResult.value.areaM2,
      distanceM,
      lineCount: planResult.value.lineCount,
      waypointCount: planResult.value.waypoints.length,
      estimateMinute
    }
  })

  let map: any = null
  let AMap: any = null
  let mouseTool: any = null
  let polygonOverlay: any = null
  let pathPolyline: any = null
  let waypointMarkers: any[] = []
  let droneMarker: any = null
  let sprayDots: any[] = []
  let drawListener: ((event: any) => void) | null = null
  let simulationTimer: ReturnType<typeof setInterval> | null = null
  let simulationIndex = 0
  let areaSelectedHandler: ((polygon: LngLat[]) => void) | null = options.onAreaSelected ?? null

  const clearSprayDots = () => {
    sprayDots.forEach(dot => dot?.setMap?.(null))
    sprayDots = []
  }

  const clearPathOverlays = () => {
    clearSprayDots()
    waypointMarkers.forEach(marker => marker?.setMap?.(null))
    waypointMarkers = []
    pathPolyline?.setMap?.(null)
    pathPolyline = null
  }

  const clearPolygon = () => {
    polygonOverlay?.setMap?.(null)
    polygonOverlay = null
    polygonPoints.value = []
  }

  const stopSimulation = () => {
    simulating.value = false
    if (simulationTimer) {
      clearInterval(simulationTimer)
      simulationTimer = null
    }
  }

  const clearAll = (silent = false) => {
    stopSimulation()
    clearPathOverlays()
    clearPolygon()
    planResult.value = null
    droneMarker?.setMap?.(null)
    droneMarker = null
    if (!silent) {
      ElMessage.info('已清空喷洒圈选与航线')
    }
  }

  const renderPath = (plan: SprayPlanResult) => {
    if (!AMap || !map) return
    clearPathOverlays()

    pathPolyline = new AMap.Polyline({
      path: plan.path,
      strokeColor: '#16a34a',
      strokeWeight: 4,
      strokeOpacity: 0.9,
      isOutline: true,
      outlineColor: '#14532d',
      zIndex: 130
    })
    pathPolyline.setMap(map)

    waypointMarkers = plan.path.map((point, idx) => new AMap.CircleMarker({
      center: point,
      radius: idx === 0 ? 6 : 4,
      strokeColor: idx === 0 ? '#f97316' : '#15803d',
      strokeWeight: 2,
      fillColor: idx === 0 ? '#fb923c' : '#86efac',
      fillOpacity: 1,
      zIndex: 131
    }))
    map.add(waypointMarkers)

    if (showPlanMarker && plan.path.length > 0) {
      droneMarker?.setMap?.(null)
      droneMarker = new AMap.Marker({
        position: plan.path[0],
        content:
          '<div style="width:14px;height:14px;border-radius:999px;background:#ef4444;border:2px solid #fee2e2;box-shadow:0 0 8px rgba(239,68,68,.5);"></div>',
        offset: new AMap.Pixel(-7, -7),
        zIndex: 135
      })
      droneMarker.setMap(map)
    } else if (!showPlanMarker) {
      droneMarker?.setMap?.(null)
      droneMarker = null
    }

    map.setFitView([polygonOverlay, pathPolyline, ...waypointMarkers])
  }

  const generatePlan = () => {
    if (polygonPoints.value.length < 3) {
      ElMessage.warning('请先圈选喷洒区域')
      return
    }
    try {
      const plan = planner.createPlan({
        polygon: polygonPoints.value,
        lineSpacing: lineSpacing.value,
        heading: params.value.lineHeading,
        altitude: params.value.altitude,
        speed: params.value.speed,
        gimbalPitch: params.value.gimbalPitch
      })
      planResult.value = plan
      renderPath(plan)
      ElMessage.success(`喷洒航线已生成：${plan.waypoints.length} 个航点`)
    } catch (error) {
      console.error(error)
      ElMessage.error('喷洒航线生成失败')
    }
  }

  const handleDrawComplete = (event: any) => {
    drawing.value = false
    const path = event?.obj?.getPath?.() ?? []
    const points: LngLat[] = path.map((p: any) => [p.getLng(), p.getLat()])
    if (points.length < 3) {
      ElMessage.warning('圈选失败，请重试')
      return
    }
    polygonOverlay?.setMap?.(null)
    polygonOverlay = event.obj
    polygonPoints.value = points
    ElMessage.success(`圈选完成，共 ${points.length} 个顶点`)
    generatePlan()
    areaSelectedHandler?.(points)
  }

  const startDrawing = () => {
    if (!mouseTool || !map) return
    stopSimulation()
    drawing.value = true
    clearPathOverlays()
    planResult.value = null
    clearPolygon()
    mouseTool.close(true)
    mouseTool.polygon({
      strokeColor: '#0ea5e9',
      strokeWeight: 2,
      fillColor: '#38bdf8',
      fillOpacity: 0.18
    })
    ElMessage.info('请在地图上圈选喷洒区域，双击结束')
  }

  const startSimulation = () => {
    if (!planResult.value || planResult.value.path.length < 2 || !AMap || !map) {
      ElMessage.warning('请先生成喷洒航线')
      return
    }
    stopSimulation()
    clearSprayDots()
    simulating.value = true
    simulationIndex = 0

    if (!droneMarker) {
      droneMarker = new AMap.Marker({
        position: planResult.value.path[0],
        content:
          '<div style="width:14px;height:14px;border-radius:999px;background:#ef4444;border:2px solid #fee2e2;box-shadow:0 0 8px rgba(239,68,68,.5);"></div>',
        offset: new AMap.Pixel(-7, -7),
        zIndex: 135
      })
      droneMarker.setMap(map)
    } else {
      droneMarker.setPosition(planResult.value.path[0])
    }
    simulationTimer = setInterval(() => {
      if (!planResult.value || !droneMarker) return
      const path = planResult.value.path
      if (simulationIndex >= path.length) {
        stopSimulation()
        ElMessage.success('喷洒模拟完成')
        return
      }

      const point = path[simulationIndex]
      droneMarker.setPosition(point)
      const dot = new AMap.Circle({
        center: point,
        radius: Math.max(1.2, params.value.sprayWidth / 2),
        strokeWeight: 0,
        fillColor: '#22c55e',
        fillOpacity: 0.2,
        zIndex: 120
      })
      dot.setMap(map)
      sprayDots.push(dot)
      if (sprayDots.length > 180) {
        const oldest = sprayDots.shift()
        oldest?.setMap?.(null)
      }
      simulationIndex += 1
    }, 300)
  }

  const exportTask = () => {
    if (!planResult.value) {
      ElMessage.warning('请先生成喷洒航线')
      return
    }

    const payload = {
      createdAt: new Date().toISOString(),
      missionType: 'agri-spray-simulation',
      params: {
        ...params.value,
        lineSpacing: Number(lineSpacing.value.toFixed(2))
      },
      stats: {
        areaM2: Number(sprayStats.value.areaM2.toFixed(2)),
        distanceM: Number(sprayStats.value.distanceM.toFixed(2)),
        lineCount: sprayStats.value.lineCount,
        waypointCount: sprayStats.value.waypointCount,
        estimateMinute: Number(sprayStats.value.estimateMinute.toFixed(2))
      },
      polygon: planResult.value.polygon,
      waypoints: planResult.value.waypoints
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `spray-mission-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const mount = (mapInstance: any, amapNamespace: any) => {
    map = mapInstance
    AMap = amapNamespace
    if (!map || !AMap || !AMap.MouseTool) return

    mouseTool = new AMap.MouseTool(map)
    drawListener = (event: any) => handleDrawComplete(event)
    mouseTool.on('draw', drawListener)
  }

  const unmount = () => {
    stopSimulation()
    if (drawListener && mouseTool) {
      mouseTool.off('draw', drawListener)
    }
    clearPathOverlays()
    clearPolygon()
    droneMarker?.setMap?.(null)
    drawListener = null
    mouseTool = null
    droneMarker = null
    map = null
    AMap = null
  }

  const setAreaSelectedHandler = (handler: (polygon: LngLat[]) => void) => {
    areaSelectedHandler = handler
  }

  return {
    drawing,
    simulating,
    polygonPoints,
    planResult,
    params,
    lineSpacing,
    sprayStats,
    startDrawing,
    generatePlan,
    startSimulation,
    stopSimulation,
    clearAll,
    exportTask,
    mount,
    unmount,
    setAreaSelectedHandler
  }
}
