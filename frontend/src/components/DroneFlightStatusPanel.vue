<template>
  <div class="flight-status-panel">
    <div class="stat-row">
      <div class="stat-card">
        <p>当前状态</p>
        <strong>{{ statusLabel }}</strong>
      </div>
      <div class="stat-card">
        <p>当前高度</p>
        <strong>{{ altitude.toFixed(1) }} m</strong>
      </div>
      <div class="stat-card">
        <p>单次步长</p>
        <strong>{{ moveStep }} m</strong>
      </div>
    </div>

    <div class="stat-row compact">
      <div class="stat-card">
        <p>累计前进</p>
        <strong>{{ forwardDistance.toFixed(1) }} m</strong>
      </div>
      <div class="stat-card">
        <p>总位移</p>
        <strong>{{ totalDistance.toFixed(1) }} m</strong>
      </div>
      <div class="stat-card">
        <p>横向位移</p>
        <strong>{{ lateralDistance.toFixed(1) }} m</strong>
      </div>
    </div>

    <div class="stat-row counts">
      <div class="stat-card minor">
        <p>起飞次数</p>
        <strong>{{ takeoffCount }}</strong>
      </div>
      <div class="stat-card minor">
        <p>降落次数</p>
        <strong>{{ landingCount }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type FlightStatusType = 'idle' | 'taking_off' | 'flying' | 'landing'

const props = defineProps<{
  status: FlightStatusType
  altitude: number
  moveStep: number
  forwardDistance: number
  totalDistance: number
  lateralDistance: number
  takeoffCount: number
  landingCount: number
}>()

const statusLabel = computed(() => {
  switch (props.status) {
    case 'taking_off':
      return '起飞中'
    case 'flying':
      return '飞行中'
    case 'landing':
      return '降落中'
    default:
      return '待命'
  }
})
</script>

<style scoped>
.flight-status-panel {
  width: 100%;
  background: rgba(5, 15, 30, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 12px;
  margin-top: 12px;
  backdrop-filter: blur(12px);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.45);
  color: #fff;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stat-row.compact {
  margin-top: 10px;
}

.stat-row.counts {
  margin-top: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stat-card {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-card p {
  margin: 0;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.65);
}

.stat-card strong {
  display: block;
  font-size: 0.95rem;
  margin-top: 4px;
}

.stat-card.minor strong {
  color: #7c3aed;
}
</style>
