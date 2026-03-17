import { computed, onBeforeUnmount, ref } from 'vue'
import { yoloAPI } from '@/api'
import type { YoloTask, YoloVideoDetectionResult } from '@/types'

type DetectionState = 'idle' | 'detecting' | 'finished'

export const useYoloVideoDetection = () => {
  const task = ref<YoloTask>('pest')
  const selectedFile = ref<File | null>(null)
  const previewUrl = ref('')
  const loading = ref(false)
  const errorMessage = ref('')
  const result = ref<YoloVideoDetectionResult | null>(null)
  const state = ref<DetectionState>('idle')

  const taskOptions = [
    { label: '虫害视频检测', value: 'pest' },
    { label: '火灾视频检测', value: 'fire' }
  ]

  const statusText = computed(() => {
    if (state.value === 'detecting') {
      return '检测中…'
    }
    if (state.value === 'finished') {
      return '检测完成'
    }
    return '等待上传'
  })

  const taskLabel = computed(() => (task.value === 'pest' ? '虫害视频检测' : '火灾视频检测'))
  const currentFileName = computed(() => selectedFile.value?.name || '')

  const resetPreview = () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = ''
    }
  }

  onBeforeUnmount(() => {
    resetPreview()
  })

  const selectFile = (file?: File | null) => {
    resetPreview()
    selectedFile.value = file ?? null
    if (file) {
      previewUrl.value = URL.createObjectURL(file)
    }
    result.value = null
    errorMessage.value = ''
    state.value = 'idle'
  }

  const runDetection = async (): Promise<{ success: boolean; message?: string }> => {
    if (!selectedFile.value) {
      errorMessage.value = '请先选择视频文件'
      return { success: false }
    }

    loading.value = true
    state.value = 'detecting'
    errorMessage.value = ''
    result.value = null

    try {
      const response = await yoloAPI.detectVideo(task.value, selectedFile.value)
      result.value = response.data
      state.value = 'finished'
      return { success: true, message: response.message }
    } catch (error: any) {
      errorMessage.value =
        error?.response?.data?.message || error?.message || '视频检测失败，请稍后重试。'
      state.value = 'idle'
      return { success: false }
    } finally {
      loading.value = false
    }
  }

  return {
    task,
    taskOptions,
    taskLabel,
    selectedFile,
    previewUrl,
    currentFileName,
    loading,
    errorMessage,
    result,
    statusText,
    state,
    selectFile,
    runDetection
  }
}
