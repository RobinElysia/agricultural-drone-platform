<template>
  <div class="drone-controller" :class="{ collapsed: !isExpanded }" :style="panelStyle">
    <div v-if="isExpanded" class="controller-card">
      <div class="controller-header" @pointerdown.prevent="startDrag">
        <span>无人机控制</span>
        <el-button type="text" size="mini" class="header-collapse" @click.stop="toggleExpanded">
          收起
        </el-button>
      </div>

      <div class="controller-actions">
        <div class="pilot-row">
          <el-button
            size="small"
            type="success"
            class="controller-btn btn-takeoff"
            @click.stop="emit('takeoff')"
            @pointerdown.stop
          >
            起飞
          </el-button>
          <el-button
            size="small"
            type="danger"
            class="controller-btn btn-landing"
            @click.stop="emit('landing')"
            @pointerdown.stop
          >
            降落
          </el-button>
        </div>

        <div class="controller-grid">
          <el-button
            size="mini"
            type="primary"
            class="controller-btn direction-btn"
            @pointerdown.prevent.stop="handleDirectionPointerDown('forward')"
            @pointerup.stop="handleDirectionPointerRelease"
            @pointerleave.stop="handleDirectionPointerRelease"
            @pointercancel.stop="handleDirectionPointerRelease"
          >
            前进
          </el-button>
          <el-button
            size="mini"
            type="primary"
            class="controller-btn direction-btn"
            @pointerdown.prevent.stop="handleDirectionPointerDown('backward')"
            @pointerup.stop="handleDirectionPointerRelease"
            @pointerleave.stop="handleDirectionPointerRelease"
            @pointercancel.stop="handleDirectionPointerRelease"
          >
            后退
          </el-button>
          <el-button
            size="mini"
            type="primary"
            class="controller-btn direction-btn"
            @pointerdown.prevent.stop="handleDirectionPointerDown('left')"
            @pointerup.stop="handleDirectionPointerRelease"
            @pointerleave.stop="handleDirectionPointerRelease"
            @pointercancel.stop="handleDirectionPointerRelease"
          >
            左移
          </el-button>
          <el-button
            size="mini"
            type="primary"
            class="controller-btn direction-btn"
            @pointerdown.prevent.stop="handleDirectionPointerDown('right')"
            @pointerup.stop="handleDirectionPointerRelease"
            @pointerleave.stop="handleDirectionPointerRelease"
            @pointercancel.stop="handleDirectionPointerRelease"
          >
            右移
          </el-button>
        </div>

        <div class="controller-grid rotate">
          <el-button
            size="mini"
            type="warning"
            class="controller-btn rotate-btn"
            @click.stop="handleRotate('ccw')"
            @pointerdown.stop
          >
            左旋
          </el-button>
          <el-button
            size="mini"
            type="warning"
            class="controller-btn rotate-btn"
            @click.stop="handleRotate('cw')"
            @pointerdown.stop
          >
            右旋
          </el-button>
        </div>

        <div class="manual-distance-block">
          <p>手动控制距离</p>
          <p class="distance-values">
            本次 {{ manualSessionDistanceDisplay }} m · 累计 {{ manualTotalDistanceDisplay }} m
          </p>
        </div>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="controller-ball"
      @click.stop="handleBallClick"
      @pointerdown.prevent="startDrag"
    >
      控
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import type { DroneMoveDirection, DroneRotateDirection } from '@/types'

const emit = defineEmits<{
  (event: 'start-move', direction: DroneMoveDirection): void
  (event: 'rotate', direction: DroneRotateDirection): void
  (event: 'takeoff'): void
  (event: 'landing'): void
  (event: 'stop-move'): void
}>()

const expandedWidth = 230
const expandedHeight = 240
const collapsedSize = 56
const viewportDefaults =
  typeof window !== 'undefined'
    ? { width: window.innerWidth, height: window.innerHeight }
    : { width: 1280, height: 720 }

const viewport = reactive({
  width: viewportDefaults.width,
  height: viewportDefaults.height
})

const position = reactive({
  left: Math.max(16, viewport.width - expandedWidth - 24),
  top: Math.max(80, viewport.height - expandedHeight - 24)
})

const isExpanded = ref(true)
const lastDragMoved = ref(false)

const dragState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  originLeft: position.left,
  originTop: position.top,
  hasMoved: false
})

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getBounds = () => {
  const width = isExpanded.value ? expandedWidth : collapsedSize
  const height = isExpanded.value ? expandedHeight : collapsedSize
  const maxLeft = Math.max(16, viewport.width - width - 24)
  const maxTop = Math.max(80, viewport.height - height - 48)
  return { minLeft: 16, minTop: 80, maxLeft, maxTop }
}

const clampPosition = () => {
  const { minLeft, minTop, maxLeft, maxTop } = getBounds()
  position.left = clamp(position.left, minLeft, maxLeft)
  position.top = clamp(position.top, minTop, maxTop)
}

const panelStyle = computed(() => ({
  width: `${isExpanded.value ? expandedWidth : collapsedSize}px`,
  height: `${isExpanded.value ? expandedHeight : collapsedSize}px`,
  left: `${position.left}px`,
  top: `${position.top}px`
}))

const handleResize = () => {
  if (typeof window === 'undefined') return
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
  clampPosition()
}

const finishDrag = () => {
  lastDragMoved.value = dragState.hasMoved
  dragState.active = false
  dragState.hasMoved = false
  document.removeEventListener('pointermove', handleDrag)
  document.removeEventListener('pointerup', finishDrag)
}

const handleDrag = (event: PointerEvent) => {
  if (!dragState.active) return
  const deltaX = event.clientX - dragState.startX
  const deltaY = event.clientY - dragState.startY
  const { minLeft, minTop, maxLeft, maxTop } = getBounds()
  position.left = clamp(dragState.originLeft + deltaX, minLeft, maxLeft)
  position.top = clamp(dragState.originTop + deltaY, minTop, maxTop)
  dragState.hasMoved = dragState.hasMoved || Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3
}

const startDrag = (event: PointerEvent) => {
  if (event.button !== 0) return
  event.stopPropagation()
  dragState.active = true
  lastDragMoved.value = false
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.originLeft = position.left
  dragState.originTop = position.top
  dragState.hasMoved = false
  document.addEventListener('pointermove', handleDrag)
  document.addEventListener('pointerup', finishDrag)
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  clampPosition()
}

const handleBallClick = () => {
  if (lastDragMoved.value) {
    lastDragMoved.value = false
    return
  }
  toggleExpanded()
}

const handleRotate = (direction: DroneRotateDirection) => {
  console.log(`[DroneControl] handleRotate('${direction}')`)
  emit('rotate', direction)
}

const handleDirectionPointerDown = (direction: DroneMoveDirection) => {
  emit('start-move', direction)
}

const handleDirectionPointerRelease = () => {
  emit('stop-move')
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

const props = defineProps<{
  manualSessionDistance?: number
  manualTotalDistance?: number
}>()

const manualSessionDistanceDisplay = computed(() => (props.manualSessionDistance ?? 0).toFixed(1))
const manualTotalDistanceDisplay = computed(() => (props.manualTotalDistance ?? 0).toFixed(1))

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  finishDrag()
  currentMessage?.close()
  handleDirectionPointerRelease()
})
</script>

<style scoped>
.drone-controller {
  position: fixed;
  z-index: 2200;
  right: auto;
  bottom: auto;
  padding: 0;
  border-radius: 16px;
  background: rgba(5, 15, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 18px 35px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(18px);
  transition: width 0.2s ease, height 0.2s ease;
  pointer-events: auto;
}

.controller-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 10px;
  pointer-events: auto;
}

.controller-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #fff;
  font-size: 0.9rem;
  cursor: grab;
}

.header-collapse {
  color: #f87159;
}

.direction-btn {
  pointer-events: auto;
  touch-action: none;
}

.controller-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.controller-grid.rotate {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.controller-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.manual-distance-block {
  margin-top: auto;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(5, 15, 30, 0.85);
  color: #e2e8f0;
  font-size: 0.78rem;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.45);
}

.manual-distance-block .distance-values {
  margin-top: 4px;
  font-weight: 700;
  color: #8ef6ff;
}

.pilot-row {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.pilot-row .controller-btn {
  flex: 1;
}

.controller-btn {
  border-radius: 10px;
  font-size: 0.85rem;
}

.rotate-btn {
  background: rgba(248, 200, 72, 0.15);
  border-color: rgba(248, 200, 72, 0.35);
  color: #fbbf24;
}

.btn-takeoff {
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
}

.btn-landing {
  background: #f87171;
  border-color: #f87171;
  color: #fff;
}

.controller-ball {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(15, 35, 60, 0.9);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.drone-controller.collapsed {
  border-radius: 50%;
  padding: 4px;
}

.controller-ball:hover {
  background: rgba(29, 78, 216, 0.9);
}
</style>
