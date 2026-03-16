<script setup lang="ts">
import { ref } from 'vue'
import type { UploadProps } from 'element-plus'
import { ElMessage } from 'element-plus'
import { yoloAPI } from '@/api'
import type { YoloDetectionResult, YoloTask } from '@/types'

const task = ref<YoloTask>('pest')
const selectedFile = ref<File | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const result = ref<YoloDetectionResult | null>(null)

const taskOptions: Array<{ label: string; value: YoloTask }> = [
  { label: '虫害检测', value: 'pest' },
  { label: '火灾检测', value: 'fire' }
]

const handleFileChange: UploadProps['onChange'] = (uploadFile) => {
  if (!uploadFile.raw) {
    selectedFile.value = null
    return
  }
  selectedFile.value = uploadFile.raw
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

const runDetection = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('Please select an image first')
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const imageBase64 = await toBase64(selectedFile.value)
    const response = await yoloAPI.detect(task.value, imageBase64, {
      filename: selectedFile.value.name
    })
    result.value = response.data
    ElMessage.success('YOLO detection completed')
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'YOLO detection failed. Please check backend or model service.'
    result.value = null
  } finally {
    loading.value = false
  }
}

const formatConfidence = (val: number) => `${(val * 100).toFixed(1)}%`
</script>

<template>
  <section class="yolo-panel">
    <div class="toolbar">
      <el-select v-model="task" size="small" class="task-select">
        <el-option v-for="item in taskOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>

      <el-upload
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
        accept=".jpg,.jpeg,.png,.bmp,.webp"
      >
        <el-button size="small">选择照片</el-button>
      </el-upload>

      <el-button type="primary" size="small" :loading="loading" :disabled="!selectedFile" @click="runDetection">
        开始检测
      </el-button>
    </div>

    <p v-if="selectedFile" class="file-tip">Current file: {{ selectedFile.name }}</p>

    <el-alert v-if="errorMessage" type="error" :closable="false" :title="errorMessage" />

    <div v-if="result" class="result-section">
      <el-image class="preview-image" :src="result.result_url" fit="cover" :preview-src-list="[result.result_url]" />
      <div class="summary">Detections: {{ result.count }}, Task: {{ task === 'pest' ? 'Pest' : 'Fire' }}</div>

      <el-scrollbar max-height="220px" class="detection-scroll">
        <div class="detection-list">
          <div v-for="(item, index) in result.detections" :key="`${item.label}-${index}`" class="detection-item">
            <span>{{ index + 1 }}. {{ item.label }}</span>
            <strong>{{ formatConfidence(item.confidence) }}</strong>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <el-empty v-else-if="!loading" description="Upload an image to run YOLO detection" :image-size="72" />
  </section>
</template>

<style scoped>
.yolo-panel {
  display: grid;
  gap: 10px;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(100px, 1fr) auto auto;
  gap: 8px;
}

.task-select {
  min-width: 108px;
}

.file-tip {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-500);
}

.result-section {
  display: grid;
  gap: 8px;
}

.preview-image {
  width: 100%;
  height: 150px;
  border-radius: 10px;
  border: 1px solid #dce7dd;
  overflow: hidden;
}

.summary {
  font-size: 0.82rem;
  color: var(--text-700);
}

.detection-scroll {
  border: 1px solid #e3ebe2;
  border-radius: 10px;
  padding: 6px 8px;
}

.detection-list {
  display: grid;
  gap: 6px;
}

.detection-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--text-700);
  border-bottom: 1px dashed #ebf1ea;
  padding-bottom: 4px;
}

.detection-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

@media (max-width: 940px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
