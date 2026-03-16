import { computed, ref } from 'vue'
import { calculateDistance } from '@/utils/geo'

export type LngLat = [number, number]

export interface SprayPlanInput {
  polygon: LngLat[]
  lineSpacing: number
  heading: number
  altitude: number
  speed: number
  gimbalPitch: number
}

export interface SprayWaypoint {
  lng: number
  lat: number
  alt: number
  speed: number
  yaw: number
  gimbalPitch: number
  spraying: boolean
}

export interface SprayPlanResult {
  polygon: LngLat[]
  path: LngLat[]
  waypoints: SprayWaypoint[]
  lineCount: number
  areaM2: number
  totalDistanceM: number
}

interface XYPoint {
  x: number
  y: number
}

const EARTH_M_PER_DEG = 111320

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function normalizePolygon(input: LngLat[]): LngLat[] {
  if (input.length < 3) return []
  const unique = input.filter((point, idx) => {
    if (idx === 0) return true
    const prev = input[idx - 1]
    return point[0] !== prev[0] || point[1] !== prev[1]
  })
  if (unique.length >= 2) {
    const first = unique[0]
    const last = unique[unique.length - 1]
    if (first[0] === last[0] && first[1] === last[1]) {
      unique.pop()
    }
  }
  return unique
}

function rotatePoint(point: XYPoint, center: XYPoint, angleDeg: number): XYPoint {
  const angle = toRad(angleDeg)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const x = point.x - center.x
  const y = point.y - center.y
  return {
    x: center.x + x * cos - y * sin,
    y: center.y + x * sin + y * cos
  }
}

function polygonArea(points: XYPoint[]): number {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y - points[j].x * points[i].y
  }
  return Math.abs(area) / 2
}

function buildIntersections(points: XYPoint[], y: number): number[] {
  const xs: number[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    if (a.y === b.y) continue
    const minY = Math.min(a.y, b.y)
    const maxY = Math.max(a.y, b.y)
    if (y < minY || y >= maxY) continue
    const t = (y - a.y) / (b.y - a.y)
    xs.push(a.x + t * (b.x - a.x))
  }
  return xs.sort((p, q) => p - q)
}

function dedupePath(path: LngLat[]): LngLat[] {
  if (path.length <= 1) return path
  const result: LngLat[] = [path[0]]
  for (let i = 1; i < path.length; i++) {
    const prev = result[result.length - 1]
    const next = path[i]
    if (prev[0] !== next[0] || prev[1] !== next[1]) {
      result.push(next)
    }
  }
  return result
}

export function useSprayPathPlanner() {
  const lastPlan = ref<SprayPlanResult | null>(null)

  const hasPlan = computed(() => Boolean(lastPlan.value && lastPlan.value.path.length > 1))

  const createPlan = (input: SprayPlanInput): SprayPlanResult => {
    const polygon = normalizePolygon(input.polygon)
    if (polygon.length < 3) {
      throw new Error('圈选区域至少需要 3 个点')
    }

    const lat0 = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length
    const lng0 = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length
    const mPerLng = EARTH_M_PER_DEG * Math.max(0.2, Math.cos(toRad(lat0)))

    const toXY = ([lng, lat]: LngLat): XYPoint => ({
      x: (lng - lng0) * mPerLng,
      y: (lat - lat0) * EARTH_M_PER_DEG
    })
    const toLngLat = (xy: XYPoint): LngLat => [
      lng0 + xy.x / mPerLng,
      lat0 + xy.y / EARTH_M_PER_DEG
    ]

    const localPolygon = polygon.map(toXY)
    const center = {
      x: localPolygon.reduce((sum, p) => sum + p.x, 0) / localPolygon.length,
      y: localPolygon.reduce((sum, p) => sum + p.y, 0) / localPolygon.length
    }
    const rotatedPolygon = localPolygon.map(p => rotatePoint(p, center, -input.heading))
    const ys = rotatedPolygon.map(p => p.y)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const safeSpacing = Math.max(1, input.lineSpacing)
    const scanLines: Array<{ start: XYPoint; end: XYPoint }> = []
    let reverse = false

    for (let y = minY + safeSpacing / 2; y <= maxY; y += safeSpacing) {
      const intersections = buildIntersections(rotatedPolygon, y)
      if (intersections.length < 2) continue
      for (let i = 0; i < intersections.length - 1; i += 2) {
        const left = intersections[i]
        const right = intersections[i + 1]
        if (right - left < 1) continue
        const start: XYPoint = { x: reverse ? right : left, y }
        const end: XYPoint = { x: reverse ? left : right, y }
        scanLines.push({ start, end })
        reverse = !reverse
      }
    }

    const path: LngLat[] = []
    for (const line of scanLines) {
      const start = rotatePoint(line.start, center, input.heading)
      const end = rotatePoint(line.end, center, input.heading)
      path.push(toLngLat(start), toLngLat(end))
    }

    const finalPath = dedupePath(path)
    const waypoints: SprayWaypoint[] = finalPath.map((point, idx) => {
      const next = finalPath[idx + 1] ?? finalPath[idx - 1] ?? finalPath[idx]
      const yaw = Math.atan2(next[1] - point[1], next[0] - point[0]) * (180 / Math.PI)
      return {
        lng: point[0],
        lat: point[1],
        alt: input.altitude,
        speed: input.speed,
        yaw,
        gimbalPitch: input.gimbalPitch,
        spraying: true
      }
    })

    let totalDistanceM = 0
    for (let i = 1; i < finalPath.length; i++) {
      totalDistanceM += calculateDistance(finalPath[i - 1], finalPath[i]) * 1000
    }

    const result: SprayPlanResult = {
      polygon,
      path: finalPath,
      waypoints,
      lineCount: scanLines.length,
      areaM2: polygonArea(localPolygon),
      totalDistanceM
    }

    lastPlan.value = result
    return result
  }

  return {
    lastPlan,
    hasPlan,
    createPlan
  }
}
