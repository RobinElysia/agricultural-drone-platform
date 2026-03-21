<template>
  <el-card class="target-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span>{{ target.name }}</span>
        <el-tag :type="getStatusType(target.status)" size="small">
          {{ statusText }}
        </el-tag>
      </div>
    </template>

    <div class="target-info">
      <div class="info-row">
        <span class="label">面积:</span>
        <span class="value">{{ target.area }} 亩</span>
      </div>
      <div class="info-row">
        <span class="label">农药量:</span>
        <span class="value">{{ target.pesticide }} 升</span>
      </div>
    </div>

    <el-button
      v-if="target.status !== 'completed'"
      type="success"
      size="small"
      class="w-full"
      @click="handleComplete"
    >
      标记为完成
    </el-button>
    <el-alert
      v-else
      title="该任务已完成"
      type="success"
      :closable="false"
    />
    <el-button
      v-if="target.status === 'completed'"
      type="danger"
      size="small"
      class="w-full yt-delete"
      @click="handleDelete"
    >
      删除
    </el-button>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkTarget } from '@/types'

const props = defineProps<{
  target: WorkTarget
}>()

const emit = defineEmits<{
  complete: [id: string]
  deleteTarget: [id: string]
}>()

const statusText = computed(() => {
  const map: Record<string, string> = {
    pending: '待办',
    'in-progress': '进行中',
    completed: '已完成'
  }
  return map[props.target.status] || props.target.status
})

const getStatusType = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'info',
    'in-progress': 'warning',
    completed: 'success'
  }
  return map[status] || 'info'
}

const handleComplete = () => {
  emit('complete', props.target.id)
}

const handleDelete = () => {
  emit('deleteTarget', props.target.id)
}
</script>

<style scoped>
.target-card {
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.target-info {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.label {
  color: #606266;
  font-weight: 500;
}

.value {
  color: #303133;
  font-weight: bold;
}

:deep(.el-card__header) {
  padding: 12px 16px;
}

:deep(.el-card__body) {
  padding: 12px 16px;
}

:deep(.el-button) {
  width: 100%;
}

.yt-delete {
  margin-top: 8px;
}
</style>
