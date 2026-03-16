<template>
  <div class="ai-assistant">
    <button
      class="ai-fab"
      type="button"
      :aria-expanded="String(aiStore.isChatOpen)"
      aria-controls="ai-chat-panel"
      @click="togglePanel"
    >
      <span class="ai-fab-icon">AI</span>
      <span class="ai-fab-text">{{ aiStore.isChatOpen ? '收起助手' : 'AI 助手' }}</span>
    </button>

    <transition name="ai-pop">
      <section
        v-if="aiStore.isChatOpen"
        id="ai-chat-panel"
        class="ai-panel"
        role="dialog"
        aria-label="AI 智能助手"
      >
        <header class="ai-panel-head">
          <div>
            <h3>AI 智能助手</h3>
            <p>随时提问飞行与作业问题</p>
          </div>
          <button class="icon-btn" type="button" aria-label="关闭" @click="closePanel">×</button>
        </header>

        <main ref="chatContainer" class="ai-messages">
          <div v-if="aiStore.chats.length === 0 && !aiStore.isLoading" class="empty-state">
            <strong>你好，我是你的飞行助手。</strong>
            <p>你可以询问路径规划、电量预警、喷洒故障与天气应对。</p>
          </div>

          <article v-for="chat in aiStore.chats" :key="chat.id" class="chat-pair">
            <div class="bubble bubble-user">
              <p>{{ chat.question }}</p>
              <time>{{ formatTime(chat.timestamp) }}</time>
            </div>
            <div class="bubble bubble-ai">
              <p>{{ chat.answer }}</p>
            </div>
          </article>

          <div v-if="aiStore.isLoading" class="bubble bubble-ai">
            <el-skeleton :rows="2" animated />
          </div>
        </main>

        <footer class="ai-panel-foot">
          <div class="quick-list">
            <button
              v-for="q in quickQuestions"
              :key="q"
              class="quick-chip"
              type="button"
              :disabled="aiStore.isLoading"
              @click="sendQuickQuestion(q)"
            >
              {{ q }}
            </button>
          </div>

          <div class="input-row">
            <el-input
              v-model="message"
              :disabled="aiStore.isLoading"
              placeholder="输入你的问题..."
              @keyup.enter="sendMessage"
            />
            <el-button type="primary" :loading="aiStore.isLoading" @click="sendMessage">发送</el-button>
          </div>

          <div class="meta-actions">
            <el-button size="small" :loading="aiStore.isLoading" @click="fetchHistory">历史</el-button>
            <el-button
              size="small"
              type="danger"
              plain
              :disabled="aiStore.isLoading || aiStore.chats.length === 0"
              @click="clearHistoryConfirm"
            >
              清空
            </el-button>
          </div>
        </footer>
      </section>
    </transition>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { ElMessageBox } from 'element-plus'
import { nextTick, onMounted, ref, watch } from 'vue'
import { useAIStore } from '@/store/ai'

const aiStore = useAIStore()
const message = ref('')
const chatContainer = ref<HTMLElement | null>(null)

const quickQuestions = [
  '如何规划无人机作业路线？',
  '无人机电池低电量怎么处理？',
  '遇到恶劣天气应该怎么做？',
  '喷洒头堵塞怎么排查？'
]

const formatTime = (timestamp: string): string => dayjs(timestamp).format('HH:mm')

const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const togglePanel = async () => {
  aiStore.toggleChat()
  if (aiStore.isChatOpen) {
    await nextTick()
    scrollToBottom()
  }
}

const closePanel = () => {
  aiStore.closeChat()
}

const sendMessage = async () => {
  if (!message.value.trim() || aiStore.isLoading) return
  const question = message.value.trim()
  message.value = ''
  await aiStore.sendQuestion(question)
  await nextTick()
  scrollToBottom()
}

const sendQuickQuestion = async (question: string) => {
  if (aiStore.isLoading) return
  message.value = question
  await sendMessage()
}

const fetchHistory = async () => {
  await aiStore.fetchHistory()
  await nextTick()
  scrollToBottom()
}

const clearHistoryConfirm = async () => {
  try {
    await ElMessageBox.confirm('确定要清空全部聊天记录吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await aiStore.clearHistory()
  } catch {
    // 用户取消
  }
}

watch(
  () => aiStore.chats.length,
  async () => {
    await nextTick()
    scrollToBottom()
  }
)

onMounted(async () => {
  await aiStore.fetchHistory()
})
</script>

<style scoped>
.ai-assistant {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 2200;
}

.ai-fab {
  border: none;
  border-radius: 999px;
  min-height: 54px;
  min-width: 54px;
  padding: 8px 14px 8px 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  background: linear-gradient(135deg, #1f9d67, #2fbf82);
  color: #fff;
  box-shadow: 0 14px 26px rgba(15, 78, 52, 0.35);
}

.ai-fab-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.18);
  font-size: 0.82rem;
  font-weight: 700;
}

.ai-fab-text {
  font-size: 0.92rem;
  font-weight: 700;
}

.ai-panel {
  position: absolute;
  right: 0;
  bottom: 66px;
  width: min(380px, calc(100vw - 24px));
  height: min(560px, calc(100vh - 96px));
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(228, 236, 231, 0.95);
  box-shadow: 0 22px 44px rgba(8, 27, 20, 0.32);
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.ai-panel-head {
  padding: 14px 14px 10px;
  border-bottom: 1px solid #e6ece6;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.ai-panel-head h3 {
  margin: 0;
  font-size: 1rem;
  color: #173427;
}

.ai-panel-head p {
  margin: 4px 0 0;
  color: #5e7468;
  font-size: 0.78rem;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: #eef3ee;
  color: #2d4438;
  cursor: pointer;
  font-size: 1rem;
}

.ai-messages {
  overflow-y: auto;
  padding: 12px;
  display: grid;
  gap: 10px;
  background: #f5f8f5;
}

.empty-state {
  color: #60766a;
  font-size: 0.88rem;
  line-height: 1.6;
  padding: 10px;
  border-radius: 10px;
  background: #fff;
}

.empty-state strong {
  display: block;
  margin-bottom: 4px;
  color: #1f3d2f;
}

.chat-pair {
  display: grid;
  gap: 6px;
}

.bubble {
  padding: 10px;
  border-radius: 10px;
  font-size: 0.88rem;
}

.bubble p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
}

.bubble-user {
  background: #dbf4e9;
  justify-self: end;
  max-width: 92%;
}

.bubble-user time {
  margin-top: 4px;
  display: block;
  color: #507565;
  font-size: 0.72rem;
}

.bubble-ai {
  background: #fff;
  border: 1px solid #e6ece6;
  max-width: 94%;
}

.ai-panel-foot {
  padding: 10px;
  border-top: 1px solid #e6ece6;
  background: #fff;
  display: grid;
  gap: 8px;
}

.quick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-chip {
  border: 1px solid #d6e2d9;
  background: #f6faf7;
  color: #305242;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 0.75rem;
  cursor: pointer;
}

.input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.meta-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ai-pop-enter-active,
.ai-pop-leave-active {
  transition: all 0.2s ease;
}

.ai-pop-enter-from,
.ai-pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 768px) {
  .ai-assistant {
    right: 12px;
    bottom: 12px;
  }

  .ai-panel {
    width: calc(100vw - 24px);
    height: min(72vh, 560px);
  }

  .ai-fab-text {
    display: none;
  }

  .ai-fab {
    width: 54px;
    padding-right: 8px;
    justify-content: center;
  }
}
</style>
