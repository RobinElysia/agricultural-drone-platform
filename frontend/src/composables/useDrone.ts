import { reactive, ref } from 'vue'

export interface DroneState {
  status: 'landed' | 'flying' | 'landing' | 'taking_off'
  altitude: number
  speed: number
  battery: number
  position: [number, number] | null
  heading: number
}

export function useDrone() {
  const droneState = reactive<DroneState>({
    status: 'landed',
    altitude: 0,
    speed: 40,
    battery: 100,
    position: null,
    heading: 0
  })

  const droneMarker = ref<any>(null)

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

  const initDrone = (map: any, AMap: any, initialBattery = 100) => {
    const center = map.getCenter()
    droneState.battery = initialBattery

    droneMarker.value = new AMap.Marker({
      position: center,
      content: droneIcon,
      offset: new AMap.Pixel(-20, -20),
      angle: 0,
      anchor: 'center'
    })

    map.add(droneMarker.value)
    droneState.position = [center.getLng(), center.getLat()]
  }

  const takeoff = async (targetAltitude = 100): Promise<void> => {
    return new Promise(resolve => {
      droneState.status = 'taking_off'
      let currentAlt = 0
      const step = targetAltitude / 50

      const interval = setInterval(() => {
        currentAlt += step
        if (currentAlt >= targetAltitude) {
          currentAlt = targetAltitude
          clearInterval(interval)
          droneState.status = 'flying'
          resolve()
        }
        droneState.altitude = Math.round(currentAlt)
      }, 50)
    })
  }

  const land = async (): Promise<void> => {
    return new Promise(resolve => {
      droneState.status = 'landing'
      let currentAlt = droneState.altitude
      const step = currentAlt / 50

      const interval = setInterval(() => {
        currentAlt -= step
        if (currentAlt <= 0) {
          currentAlt = 0
          clearInterval(interval)
          droneState.status = 'landed'
          resolve()
        }
        droneState.altitude = Math.round(currentAlt)
      }, 50)
    })
  }

  const updateAltitude = (altitude: number) => {
    droneState.altitude = altitude
  }

  const updateSpeed = (speed: number) => {
    droneState.speed = speed
  }

  const updateBattery = (flownDistance: number) => {
    const consumption = 0.1
    const consumed = flownDistance * consumption
    droneState.battery = Math.max(0, 100 - consumed)
  }

  const updatePosition = (position: [number, number]) => {
    droneState.position = position
    droneMarker.value?.setPosition?.(position)
  }

  const updateHeading = (heading: number) => {
    droneState.heading = heading
    droneMarker.value?.setAngle?.(heading)
  }

  const reset = () => {
    droneState.status = 'landed'
    droneState.altitude = 0
    droneState.speed = 0
    droneState.battery = 100
    droneState.heading = 0
  }

  return {
    droneState,
    droneMarker,
    initDrone,
    takeoff,
    land,
    updateAltitude,
    updateSpeed,
    updateBattery,
    updatePosition,
    updateHeading,
    reset
  }
}
