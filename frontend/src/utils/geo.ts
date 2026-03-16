export function calculateDistance(p1: [number, number], p2: [number, number]): number {
  const R = 6371
  
  const lat1 = p1[1] * Math.PI / 180
  const lat2 = p2[1] * Math.PI / 180
  const deltaLat = (p2[1] - p1[1]) * Math.PI / 180
  const deltaLon = (p2[0] - p1[0]) * Math.PI / 180
  
  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  
  return R * c
}

export function calculateBearing(p1: [number, number], p2: [number, number]): number {
  const lat1 = p1[1] * Math.PI / 180
  const lat2 = p2[1] * Math.PI / 180
  const lon1 = p1[0] * Math.PI / 180
  const lon2 = p2[0] * Math.PI / 180
  
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI
  bearing = (bearing + 360) % 360
  
  return bearing
}

export function calculatePathLength(points: [number, number][]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += calculateDistance(points[i-1], points[i])
  }
  return total
}
