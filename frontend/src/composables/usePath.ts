import { reactive, ref } from 'vue'

export interface PathStats {
  totalDistance: number
  estimatedTime: number
  waypointCount: number
  flownDistance: number
}

export function usePath() {
  const pathPoints = ref<[number, number][]>([])
  const pathSimplifier = ref<any>(null)
  const pathNavigator = ref<any>(null)
  const waypointMarkers = ref<any[]>([])
  const pathStats = reactive<PathStats>({
    totalDistance: 0,
    estimatedTime: 0,
    waypointCount: 0,
    flownDistance: 0
  })

  const initPathSimplifier = (PathSimplifier: any, map: any) => {
    if (!PathSimplifier.supportCanvas) {
      console.warn('PathSimplifier requires Canvas support.')
      return
    }

    pathSimplifier.value = new PathSimplifier({
      map,
      zIndex: 100,
      getPath(pathData: any) {
        return pathData.path
      },
      getHoverTitle(pathData: any, _pathIndex: number, pointIndex: number) {
        if (pointIndex >= 0) {
          return `航点 ${pointIndex + 1}/${pathData.path.length}`
        }
        return `总航点数: ${pathData.path.length}`
      },
      renderOptions: {
        renderAllPointsIfNumberBelow: 100,
        pathLineStyle: {
          strokeStyle: '#1890ff',
          lineWidth: 4,
          dirArrowStyle: true
        },
        keyPointStyle: {
          radius: 6,
          fillStyle: '#1890ff',
          strokeStyle: '#fff',
          lineWidth: 2
        },
        keyPointHoverStyle: {
          radius: 8,
          fillStyle: '#40a9ff'
        }
      }
    })
  }

  const updatePathDisplay = () => {
    if (!pathSimplifier.value || pathPoints.value.length === 0) return
    pathSimplifier.value.setData([
      {
        name: '规划路径',
        path: pathPoints.value
      }
    ])
  }

  const addWaypoint = (lnglat: [number, number], AMap: any, map: any) => {
    pathPoints.value.push(lnglat)
    const waypointIndex = pathPoints.value.length - 1

    const marker = new AMap.Marker({
      position: lnglat,
      content: `<div style="
        background:#1890ff;
        color:#fff;
        width:24px;
        height:24px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:12px;
        font-weight:bold;
        border:2px solid #fff;
        box-shadow:0 2px 4px rgba(0,0,0,.3);
      ">${waypointIndex}</div>`,
      offset: new AMap.Pixel(-12, -12),
      anchor: 'center',
      title: `航点 ${waypointIndex}`
    })

    waypointMarkers.value.push(marker)
    map.add(marker)
    updatePathDisplay()
  }

  const clearPath = (map: any) => {
    waypointMarkers.value.forEach(marker => map?.remove(marker))
    waypointMarkers.value = []
    pathPoints.value = []

    if (pathSimplifier.value) {
      pathSimplifier.value.setData([])
    }

    if (pathNavigator.value) {
      pathNavigator.value.destroy()
      pathNavigator.value = null
    }

    pathStats.totalDistance = 0
    pathStats.estimatedTime = 0
    pathStats.waypointCount = 0
    pathStats.flownDistance = 0
  }

  const createNavigator = (speed: number) => {
    if (!pathSimplifier.value) {
      console.warn('PathSimplifier is not initialized.')
      return
    }

    if (pathNavigator.value) {
      pathNavigator.value.destroy()
    }

    const droneIcon = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="droneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1890ff"/>
            <stop offset="100%" style="stop-color:#096dd9"/>
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="20" rx="8" ry="12" fill="url(#droneGrad)" stroke="#fff" stroke-width="2"/>
        <line x1="5" y1="5" x2="35" y2="35" stroke="#333" stroke-width="3" stroke-linecap="round"/>
        <line x1="35" y1="5" x2="5" y2="35" stroke="#333" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="5" cy="5" rx="6" ry="2" fill="#666" transform="rotate(45 5 5)"/>
        <ellipse cx="35" cy="5" rx="6" ry="2" fill="#666" transform="rotate(-45 35 5)"/>
        <ellipse cx="5" cy="35" rx="6" ry="2" fill="#666" transform="rotate(-45 5 35)"/>
        <ellipse cx="35" cy="35" rx="6" ry="2" fill="#666" transform="rotate(45 35 35)"/>
        <circle cx="20" cy="16" r="3" fill="#52c41a"/>
        <circle cx="20" cy="24" r="2" fill="#ff4d4f"/>
      </svg>
    `

    try {
      pathNavigator.value = pathSimplifier.value.createPathNavigator(0, {
        loop: false,
        speed: (speed * 1000) / 3600,
        pathNavigatorStyle: {
          width: 40,
          height: 40,
          content: droneIcon,
          initRotateDegree: 0
        }
      })
    } catch (error) {
      console.error('Failed to create path navigator:', error)
    }
  }

  const startNavigation = () => {
    pathNavigator.value?.start?.()
  }

  const pauseNavigation = () => {
    pathNavigator.value?.pause?.()
  }

  const stopNavigation = () => {
    pathNavigator.value?.stop?.()
  }

  return {
    pathPoints,
    pathSimplifier,
    pathNavigator,
    pathStats,
    waypointMarkers,
    initPathSimplifier,
    addWaypoint,
    clearPath,
    createNavigator,
    startNavigation,
    pauseNavigation,
    stopNavigation
  }
}
