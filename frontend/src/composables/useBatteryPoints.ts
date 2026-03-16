import { ref } from 'vue'

export interface BatteryPoint {
  id: number
  name: string
  lnglat: [number, number]
}

export function useBatteryPoints() {
  const batteryPoints = ref<BatteryPoint[]>([])
  const batteryMarkers = ref<Map<number, { marker: any; infoWindow: any }>>(new Map())

  const batteryIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="batteryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#52c41a"/>
          <stop offset="100%" style="stop-color:#389e0d"/>
        </linearGradient>
      </defs>
      <rect x="2" y="8" width="24" height="16" rx="2" fill="url(#batteryGrad)" stroke="#fff" stroke-width="2"/>
      <rect x="26" y="12" width="4" height="8" rx="1" fill="#fff" stroke="#fff" stroke-width="1"/>
      <text x="14" y="20" font-size="12" fill="white" text-anchor="middle" font-weight="bold">B</text>
    </svg>
  `

  const addPoint = (point: BatteryPoint) => {
    if (batteryPoints.value.some(p => p.id === point.id)) return
    batteryPoints.value.push(point)
  }

  const removePoint = (id: number, map: any) => {
    const index = batteryPoints.value.findIndex(p => p.id === id)
    if (index < 0) return

    const markerData = batteryMarkers.value.get(id)
    if (markerData) {
      map?.remove(markerData.marker)
      batteryMarkers.value.delete(id)
    }

    batteryPoints.value.splice(index, 1)
  }

  const clearPoints = (map: any) => {
    batteryMarkers.value.forEach(data => {
      map?.remove(data.marker)
    })
    batteryMarkers.value.clear()
    batteryPoints.value = []
  }

  const createMarker = (point: BatteryPoint, map: any, AMap: any) => {
    if (!map || !AMap || batteryMarkers.value.has(point.id)) return

    const marker = new AMap.Marker({
      position: point.lnglat,
      content: batteryIcon,
      offset: new AMap.Pixel(-16, -16),
      anchor: 'center',
      title: point.name,
      zIndex: 50
    })

    const infoWindow = new AMap.InfoWindow({
      content: `
        <div style="padding: 12px; min-width: 180px; font-size: 12px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #52c41a;">${point.name}</div>
          <div style="color: #666; line-height: 1.8;">
            <div>纬度: <span style="font-weight: bold;">${point.lnglat[1].toFixed(6)}</span></div>
            <div>经度: <span style="font-weight: bold;">${point.lnglat[0].toFixed(6)}</span></div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; color: #999;">
              电池更换站点
            </div>
          </div>
        </div>
      `,
      offset: new AMap.Pixel(0, -40),
      isCustom: true,
      autoMove: true,
      closeWhenClickMap: true
    })

    marker.on('click', () => {
      infoWindow.open(map, point.lnglat)
    })

    map.add(marker)
    batteryMarkers.value.set(point.id, { marker, infoWindow })
  }

  return {
    batteryPoints,
    batteryMarkers,
    addPoint,
    removePoint,
    clearPoints,
    createMarker
  }
}
