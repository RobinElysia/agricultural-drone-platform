import { computed, ref } from 'vue'
import { calculateDistance } from '@/utils/geo'

type LngLat = [number, number]
type ZoneCategory = 'water' | 'mountain' | 'no_fly'

interface CircleRiskZone {
  id: string
  name: string
  category: ZoneCategory
  center: LngLat
  radius: number
}

interface PolygonRiskZone {
  id: string
  name: string
  category: ZoneCategory
  path: LngLat[]
}

type RiskZone = CircleRiskZone | PolygonRiskZone

interface SearchConfig {
  keyword: string
  category: ZoneCategory
  radius: number
}

const SEARCH_CONFIGS: SearchConfig[] = [
  { keyword: '\u6e56', category: 'water', radius: 300 },
  { keyword: '\u6cb3\u6d41', category: 'water', radius: 260 },
  { keyword: '\u6c34\u5e93', category: 'water', radius: 360 },
  { keyword: '\u5c71\u5730', category: 'mountain', radius: 260 },
  { keyword: '\u673a\u573a', category: 'no_fly', radius: 900 },
  { keyword: '\u7981\u98de\u533a', category: 'no_fly', radius: 1000 },
  { keyword: '\u519b\u4e8b\u7ba1\u7406\u533a', category: 'no_fly', radius: 1000 }
]
const categoryStyle: Record<ZoneCategory, { stroke: string; fill: string }> = {
  water: { stroke: '#0284c7', fill: '#38bdf84d' },
  mountain: { stroke: '#b45309', fill: '#f59e0b40' },
  no_fly: { stroke: '#dc2626', fill: '#ef444440' }
}

const categoryBufferM: Record<ZoneCategory, number> = {
  water: 70,
  mountain: 90,
  no_fly: 140
}

const toLngLatTuple = (value: any): LngLat | null => {
  if (!value) return null
  if (Array.isArray(value) && value.length >= 2) {
    return [Number(value[0]), Number(value[1])]
  }
  if (typeof value.getLng === 'function' && typeof value.getLat === 'function') {
    return [value.getLng(), value.getLat()]
  }
  if (typeof value.lng === 'number' && typeof value.lat === 'number') {
    return [value.lng, value.lat]
  }
  return null
}

const pointInPolygon = (point: LngLat, polygon: LngLat[]) => {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersect = ((yi > y) !== (yj > y)) && (
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi
    )
    if (intersect) inside = !inside
  }
  return inside
}

const inZone = (point: LngLat, zone: RiskZone, safetyBufferM = 60) => {
  if ('center' in zone) {
    const km = calculateDistance(point, zone.center)
    return km <= (zone.radius + safetyBufferM) / 1000
  }
  return pointInPolygon(point, zone.path)
}

const getZoneBuffer = (zone: RiskZone, fallback = 60) => {
  return categoryBufferM[zone.category] ?? fallback
}

const segmentCrossesRisk = (a: LngLat, b: LngLat, zones: RiskZone[]) => {
  const distM = calculateDistance(a, b) * 1000
  const steps = Math.max(6, Math.ceil(distM / 60))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p: LngLat = [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t
    ]
    if (zones.some(zone => inZone(p, zone, getZoneBuffer(zone)))) {
      return true
    }
  }
  return false
}

const simplifyPath = (path: LngLat[], zones: RiskZone[]) => {
  if (path.length <= 2) return path
  const simplified: LngLat[] = [path[0]]
  let cursor = 0
  while (cursor < path.length - 1) {
    let next = path.length - 1
    while (next > cursor + 1) {
      if (!segmentCrossesRisk(path[cursor], path[next], zones)) break
      next--
    }
    simplified.push(path[next])
    cursor = next
  }
  return simplified
}

export function useSmartPathPlanning() {
  const riskZones = ref<RiskZone[]>([])
  const zoneOverlays = ref<any[]>([])
  const loadingRiskZones = ref(false)

  const riskSummary = computed(() => {
    const result = { water: 0, mountain: 0, noFly: 0 }
    for (const zone of riskZones.value) {
      if (zone.category === 'water') result.water++
      if (zone.category === 'mountain') result.mountain++
      if (zone.category === 'no_fly') result.noFly++
    }
    return result
  })

  const clearZoneOverlays = (map?: any) => {
    if (zoneOverlays.value.length === 0) return
    if (map) {
      map.remove(zoneOverlays.value)
    } else {
      zoneOverlays.value.forEach(overlay => overlay?.setMap?.(null))
    }
    zoneOverlays.value = []
  }

  const searchPOIsInBounds = (placeSearch: any, keyword: string, bounds: any): Promise<any[]> => {
    return new Promise((resolve) => {
      placeSearch.searchInBounds(keyword, bounds, (status: string, result: any) => {
        if (status !== 'complete') {
          resolve([])
          return
        }
        const pois = result?.poiList?.pois || []
        resolve(pois)
      })
    })
  }

  const loadAndRenderRiskZones = async (map: any, AMap: any) => {
    if (!map || !AMap) return riskZones.value
    loadingRiskZones.value = true
    clearZoneOverlays(map)

    try {
      const bounds = map.getBounds?.()
      if (!bounds || !AMap.PlaceSearch) {
        riskZones.value = []
        return riskZones.value
      }

      const placeSearch = new AMap.PlaceSearch({
        pageSize: 20,
        extensions: 'base',
        autoFitView: false
      })

      const dedupe = new Set<string>()
      const zones: RiskZone[] = []

      for (const config of SEARCH_CONFIGS) {
        const pois = await searchPOIsInBounds(placeSearch, config.keyword, bounds)
        for (const poi of pois) {
          const lnglat = toLngLatTuple(poi?.location)
          if (!lnglat) continue
          const dedupeKey = `${config.category}:${lnglat[0].toFixed(4)}:${lnglat[1].toFixed(4)}`
          if (dedupe.has(dedupeKey)) continue
          dedupe.add(dedupeKey)

          zones.push({
            id: `${config.category}-${dedupe.size}`,
            name: poi?.name || config.keyword,
            category: config.category,
            center: lnglat,
            radius: config.radius
          })

          if (zones.length >= 36) break
        }
      }

      riskZones.value = zones

      const overlays = zones.map(zone => {
        const style = categoryStyle[zone.category]
        if ('center' in zone) {
          return new AMap.Circle({
            center: zone.center,
            radius: zone.radius,
            strokeWeight: 1.5,
            strokeColor: style.stroke,
            fillColor: style.fill,
            fillOpacity: 0.45,
            bubble: true
          })
        }
        return new AMap.Polygon({
          path: zone.path,
          strokeWeight: 1.5,
          strokeColor: style.stroke,
          fillColor: style.fill,
          fillOpacity: 0.45,
          bubble: true
        })
      })

      zoneOverlays.value = overlays
      if (overlays.length > 0) {
        map.add(overlays)
      }
      return riskZones.value
    } finally {
      loadingRiskZones.value = false
    }
  }

  const planSmartSegment = (start: LngLat, end: LngLat): LngLat[] => {
    const zones = riskZones.value
    if (zones.length === 0 || !segmentCrossesRisk(start, end, zones)) {
      return [start, end]
    }

    const allLng = [start[0], end[0]]
    const allLat = [start[1], end[1]]
    for (const zone of zones) {
      if ('center' in zone) {
        const dLat = zone.radius / 111320
        const dLng = zone.radius / (111320 * Math.cos(zone.center[1] * Math.PI / 180))
        allLng.push(zone.center[0] - dLng, zone.center[0] + dLng)
        allLat.push(zone.center[1] - dLat, zone.center[1] + dLat)
      } else {
        for (const point of zone.path) {
          allLng.push(point[0])
          allLat.push(point[1])
        }
      }
    }

    const minLng = Math.min(...allLng)
    const maxLng = Math.max(...allLng)
    const minLat = Math.min(...allLat)
    const maxLat = Math.max(...allLat)
    const lat0 = (minLat + maxLat) / 2
    const cosLat = Math.max(0.2, Math.cos(lat0 * Math.PI / 180))
    const meterPerLng = 111320 * cosLat
    const meterPerLat = 111320
    const widthM = Math.max(500, (maxLng - minLng) * meterPerLng)
    const heightM = Math.max(500, (maxLat - minLat) * meterPerLat)

    const maxCells = 150
    const baseCell = 70
    const cellSize = Math.max(baseCell, Math.ceil(Math.max(widthM, heightM) / maxCells))
    const padding = cellSize * 6
    const originX = minLng * meterPerLng - padding
    const originY = minLat * meterPerLat - padding
    const cols = Math.ceil((widthM + padding * 2) / cellSize)
    const rows = Math.ceil((heightM + padding * 2) / cellSize)
    if (cols > 240 || rows > 240) {
      return [start, end]
    }

    const lngLatToCell = (p: LngLat) => {
      const x = p[0] * meterPerLng - originX
      const y = p[1] * meterPerLat - originY
      return {
        x: Math.min(cols - 1, Math.max(0, Math.floor(x / cellSize))),
        y: Math.min(rows - 1, Math.max(0, Math.floor(y / cellSize)))
      }
    }
    const cellToLngLat = (x: number, y: number): LngLat => {
      const meterX = originX + (x + 0.5) * cellSize
      const meterY = originY + (y + 0.5) * cellSize
      return [meterX / meterPerLng, meterY / meterPerLat]
    }

    const startCell = lngLatToCell(start)
    const endCell = lngLatToCell(end)
    const startKey = `${startCell.x},${startCell.y}`
    const endKey = `${endCell.x},${endCell.y}`

    const blocked = (x: number, y: number) => {
      const key = `${x},${y}`
      if (key === startKey || key === endKey) return false
      const p = cellToLngLat(x, y)
      return zones.some(zone => inZone(p, zone, getZoneBuffer(zone, 80)))
    }

    const open: Array<{ x: number; y: number; f: number; g: number }> = [
      { x: startCell.x, y: startCell.y, f: 0, g: 0 }
    ]
    const cameFrom = new Map<string, string>()
    const gScore = new Map<string, number>([[startKey, 0]])
    const closed = new Set<string>()
    const directions = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, Math.SQRT2],
      [1, -1, Math.SQRT2],
      [-1, 1, Math.SQRT2],
      [-1, -1, Math.SQRT2]
    ] as const

    const heuristic = (x: number, y: number) => {
      const dx = endCell.x - x
      const dy = endCell.y - y
      return Math.sqrt(dx * dx + dy * dy)
    }

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f)
      const current = open.shift()!
      const currentKey = `${current.x},${current.y}`
      if (closed.has(currentKey)) continue
      if (currentKey === endKey) {
        const cells: Array<{ x: number; y: number }> = []
        let trace = currentKey
        while (trace) {
          const [sx, sy] = trace.split(',').map(Number)
          cells.push({ x: sx, y: sy })
          trace = cameFrom.get(trace) || ''
        }
        cells.reverse()

        const rawPath = cells.map(c => cellToLngLat(c.x, c.y))
        rawPath[0] = start
        rawPath[rawPath.length - 1] = end
        return simplifyPath(rawPath, zones)
      }

      closed.add(currentKey)

      for (const [dx, dy, stepCost] of directions) {
        const nx = current.x + dx
        const ny = current.y + dy
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue
        if (blocked(nx, ny)) continue

        const neighborKey = `${nx},${ny}`
        const tentativeG = current.g + stepCost
        if (tentativeG >= (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) continue
        cameFrom.set(neighborKey, currentKey)
        gScore.set(neighborKey, tentativeG)
        open.push({
          x: nx,
          y: ny,
          g: tentativeG,
          f: tentativeG + heuristic(nx, ny)
        })
      }
    }

    return [start, end]
  }

  return {
    riskZones,
    loadingRiskZones,
    riskSummary,
    loadAndRenderRiskZones,
    clearZoneOverlays,
    planSmartSegment
  }
}

