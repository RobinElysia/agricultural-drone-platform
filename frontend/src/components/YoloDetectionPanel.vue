<script setup lang="ts">
import type { UploadProps } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useYoloVideoDetection } from '@/composables/useYoloVideoDetection'

const {
  task,
  taskOptions,
  taskLabel,
  previewUrl,
  currentFileName,
  loading,
  errorMessage,
  result,
  statusText,
  state,
  selectFile,
  runDetection
} = useYoloVideoDetection()

const handleFileChange: UploadProps['onChange'] = (uploadFile) => {
  selectFile(uploadFile.raw ?? null)
}

const triggerDetection = async () => {
  const { success, message } = await runDetection()
  if (success) {
    ElMessage.success(message || '视频检测已完成')
  }
}
</script>

<template>
  <section class="yolo-panel">
    <div class="panel-header">
      <div>
        <p class="panel-title">图像识别</p>
        <p class="status-line">
          <span>检测状态</span>
          <strong :class="[`state-${state}`]">{{ statusText }}</strong>
        </p>
      </div>
      <div class="task-label">{{ taskLabel }}</div>
    </div>

    <div class="toolbar">
      <el-select v-model="task" size="small" class="task-select">
        <el-option v-for="item in taskOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>

      <el-upload
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
        accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,.mp4,.mov,.webm,.avi,.mkv"
      >
        <el-button plain size="small">选择视频</el-button>
      </el-upload>

      <el-button type="primary" size="small" :loading="loading" :disabled="loading" @click="triggerDetection">
        开始检测
      </el-button>
    </div>

    <p v-if="currentFileName" class="file-tip">当前视频: {{ currentFileName }}</p>

    <el-alert v-if="errorMessage" type="error" :closable="false" :title="errorMessage" />

    <div v-if="previewUrl" class="preview-section">
      <div class="preview-title">原始视频预览</div>
      <video class="preview-video" :src="previewUrl" controls preload="metadata" />
    </div>

    <div v-if="result" class="result-section">
      <div class="preview-title">检测结果</div>
      <video class="preview-video" :src="result.result_url" controls preload="metadata" />
      <p class="result-message" v-if="result.message">{{ result.message }}</p>
      <div class="result-grid">
        <span>总帧数: {{ result.total_frames }}</span>
        <span>命中帧数: {{ result.frames_with_detections }}</span>
        <span>总检测数: {{ result.total_detections }}</span>
      </div>
      <div class="result-links">
        <a v-if="result.upload_url" class="result-link" :href="result.upload_url" target="_blank" rel="noopener noreferrer">
          查看上传视频
        </a>
        <a class="result-link" :href="result.result_url" target="_blank" rel="noopener noreferrer">
          查看标注结果
        </a>
      </div>
    </div>

    <el-empty v-else-if="!loading" description="选择视频后点击开始检测，识别结果会在此展示。" :image-size="72" />
  </section>
</template>

<style scoped>
.yolo-panel {
  display: grid;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(9, 44, 25, 0.9), rgba(5, 27, 17, 0.9));
  border-radius: 12px;
  color: #d5f0d5;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.panel-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.status-line {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--text-400);
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-line strong {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
}

.status-line strong.state-detecting {
  background: rgba(255, 255, 255, 0.1);
  color: #08f5ff;
}

.status-line strong.state-finished {
  background: rgba(40, 175, 99, 0.2);
  color: #64ffda;
}

.status-line strong.state-idle {
  background: rgba(255, 255, 255, 0.08);
  color: #a5d6a7;
}

.task-label {
  font-size: 0.75rem;
  color: #a5d6a7;
  font-weight: 600;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto auto;
  gap: 8px;
  align-items: stretch;
}

.task-select .el-select__caret {
  color: #fff;
}

.file-tip {
  margin: 0;
  font-size: 0.78rem;
  color: #d4f2d3;
}

.preview-section,
.result-section {
  display: grid;
  gap: 8px;
}

.preview-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: #b3f7c9;
  margin: 0;
}

.preview-video {
  width: 100%;
  height: 150px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: #0b1b0d;
  object-fit: cover;
}

.result-section {
  padding: 10px;
  border-radius: 10px;
  background: rgba(12, 41, 20, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.result-message {
  margin: 0;
  font-size: 0.78rem;
  color: #dff6e1;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(64px, 1fr));
  gap: 8px;
  margin: 6px 0;
  font-size: 0.75rem;
  color: #bde4c5;
}

.result-links {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.result-link {
  font-size: 0.72rem;
  color: #72c278;
  text-decoration: underline;
}

.el-alert {
  padding: 6px 12px;
  border-radius: 8px;
}

.toolbar .el-upload__inner {
  width: 100%;
  height: 38px;
}

.toolbar .el-button {
  height: 38px;
}

@media (max-width: 860px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
