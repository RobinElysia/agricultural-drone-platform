<template>
  <div class="ai-container">
    <el-container>
      <el-header class="header">
        <div class="header-content">
          <div>
            <h1>AI 智能助手</h1>
            <p>农业无人机操作答疑与故障排查</p>
          </div>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </el-header>

      <el-main>
        <el-card class="card">
          <template #header>
            <div class="card-header">
              <span>对话窗口</span>
              <div class="card-actions">
                <el-button
                  size="small"
                  @click="fetchHistory"
                  :loading="aiStore.isLoading"
                >加载历史</el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="clearHistoryConfirm"
                  :disabled="aiStore.chats.length === 0"
                >清除历史</el-button>
              </div>
            </div>
          </template>

          <!-- Chat Messages -->
          <div class="chat-messages" ref="chatContainer">
            <div v-if="aiStore.chats.length === 0 && !aiStore.isLoading" class="empty-state">
              <div class="icon">✓</div>
              <p>欢迎使用 AI 智能助手！</p>
              <p class="tips">我可以帮您解答农业无人机相关问题</p>
            </div>

            <div v-for="chat in aiStore.chats" :key="chat.id" class="chat-group">
              <!-- User Message -->
              <div class="message user-message">
                <div class="message-content">{{ chat.question }}</div>
                <div class="message-time">{{ formatTime(chat.timestamp) }}</div>
              </div>

              <!-- AI Message -->
              <div class="message ai-message">
                <div class="message-content">{{ chat.answer }}</div>
                <div class="message-time">AI 助手</div>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="aiStore.isLoading" class="message ai-message">
              <div class="message-content">
                <el-skeleton :rows="2" animated />
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="chat-input-area">
            <!-- Quick Questions -->
            <div v-if="quickQuestions.length > 0" class="quick-questions">
              <div class="label">快速提问：</div>
              <div class="questions">
                <el-button
                  v-for="q in quickQuestions"
                  :key="q"
                  size="small"
                  @click="askQuestion(q)"
                  :loading="aiStore.isLoading"
                >{{ q }}</el-button>
              </div>
            </div>

            <!-- Input Field -->
            <el-input-group>
              <el-input
                v-model="currentQuestion"
                :disabled="aiStore.isLoading"
                placeholder="请输入您的问题..."
                @keyup.enter="sendQuestion"
              />
              <el-button
                type="primary"
                @click="sendQuestion"
                :loading="aiStore.isLoading"
              >发送</el-button>
            </el-input-group>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAIStore } from '@/store/ai'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const router = useRouter()
const aiStore = useAIStore()
const chatContainer = ref<HTMLDivElement>()
const currentQuestion = ref('')

const quickQuestions = computed(() => [
  '如何规划无人机作业路线？',
  '无人机电池低电量警告如何处理？',
  '无人机遇到恶劣天气怎么办？',
  '如何清理无人机喷洒头？'
])

const formatTime = (timestamp: string): string => {
  return dayjs(timestamp).format('HH:mm')
}

const sendQuestion = async () => {
  const question = currentQuestion.value.trim()
  if (!question) {
    ElMessage.warning('请输入问题')
    return
  }

  currentQuestion.value = ''
  await askQuestion(question)
}

const askQuestion = async (question: string) => {
  await aiStore.sendQuestion(question)
  await nextTick()
  scrollToBottom()
}

const fetchHistory = async () => {
  await aiStore.fetchHistory()
  ElMessage.success('历史记录已加载')
  await nextTick()
  scrollToBottom()
}

const clearHistoryConfirm = async () => {
  try {
    await ElMessageBox.confirm('确定要清除所有聊天记录吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await aiStore.clearHistory()
    ElMessage.success('聊天记录已清除')
  } catch {
    // User cancelled
  }
}

const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

onMounted(async () => {
  await aiStore.fetchHistory()
  await nextTick()
  scrollToBottom()
})
</script>

<style scoped>
.ai-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
  padding: 0 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.header p {
  margin: 4px 0 0 0;
  color: #606266;
  font-size: 14px;
}

.card {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-state .icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
}

.empty-state .tips {
  font-size: 12px;
  margin-top: 8px;
}

.chat-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  word-wrap: break-word;
  word-break: break-all;
}

.user-message {
  align-self: flex-end;
}

.user-message .message-content {
  background-color: #409eff;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  border-bottom-right-radius: 4px;
}

.ai-message {
  align-self: flex-start;
}

.ai-message .message-content {
  background-color: #f0f2f5;
  color: #303133;
  padding: 12px 16px;
  border-radius: 8px;
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  padding: 0 4px;
}

.user-message .message-time {
  text-align: right;
}

.chat-input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.quick-questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-questions .label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.quick-questions .questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-main) {
  padding: 16px;
}

:deep(.el-input-group) {
  display: flex;
}

:deep(.el-input__inner) {
  border-radius: 4px 0 0 4px;
}

:deep(.el-button--primary) {
  border-radius: 0 4px 4px 0;
}
</style>
