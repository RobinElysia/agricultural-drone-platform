<template>
  <div class="page-shell auth-page">
    <section class="auth-grid">
      <article class="brand-panel dark-card">
        <p class="brand-kicker">Agricultural Operations</p>
        <h1 class="brand-title">无人机作业控制中心</h1>
        <p class="brand-desc">
          统一管理飞行状态、环境参数、作业目标与智能问答。
        </p>
        <ul class="brand-list">
          <li>实时地图 + 路径规划</li>
          <li>多角色权限控制</li>
          <li>任务与设备状态联动</li>
        </ul>
      </article>

      <article class="frost-card auth-card">
        <header class="auth-head">
          <h2>登录平台</h2>
          <p>请输入账号信息</p>
        </header>

        <form class="auth-form" @submit.prevent="handleLogin">
          <label class="field-label" for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            class="field-input"
            type="text"
            placeholder="例如：admin"
            :disabled="isLoading"
            required
          />

          <label class="field-label" for="password">密码</label>
          <div class="password-wrap">
            <input
              id="password"
              v-model="form.password"
              class="field-input"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              :disabled="isLoading"
              required
            />
            <button type="button" class="toggle-btn" @click="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </button>
          </div>

          <label class="field-label" for="role">角色</label>
          <select id="role" v-model="form.role" class="field-input" :disabled="isLoading" required>
            <option value="" disabled>请选择角色</option>
            <option value="admin">管理员</option>
            <option value="operator">操作员</option>
            <option value="agriculturalist">农业员</option>
          </select>

          <button class="submit-btn" type="submit" :disabled="isLoading">
            {{ isLoading ? '登录中...' : '登录' }}
          </button>
        </form>

        <footer class="auth-foot">
          <span>还没有账号？</span>
          <router-link to="/register">立即注册</router-link>
        </footer>

        <section class="demo-box">
          <h3>测试账号</h3>
          <p>`admin / admin123`</p>
          <p>`operator / operator123`</p>
          <p>`farmer / farmer123`</p>
        </section>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { UserRole } from '@/types'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({
  username: '',
  password: '',
  role: '' as UserRole
})

const isLoading = ref(false)
const showPassword = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  const ok = await userStore.login(form.username, form.password, form.role)

  if (ok) {
    ElMessage.success('登录成功')
    router.push('/')
  } else {
    ElMessage.error(userStore.error || '登录失败，请检查账号与密码')
  }

  isLoading.value = false
}
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-grid {
  width: min(1080px, 100%);
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 18px;
}

.brand-panel {
  padding: 34px;
}

.brand-kicker {
  margin: 0;
  color: #98d7b7;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.78rem;
}

.brand-title {
  margin: 14px 0 10px;
  font-size: clamp(1.7rem, 2.6vw, 2.3rem);
  line-height: 1.18;
}

.brand-desc {
  margin: 0;
  color: #c8e6d5;
  line-height: 1.6;
}

.brand-list {
  margin: 18px 0 0;
  padding-left: 18px;
  color: #e6f5ec;
  line-height: 1.8;
}

.auth-card {
  padding: 28px;
}

.auth-head h2 {
  margin: 0;
  font-size: 1.4rem;
}

.auth-head p {
  margin: 6px 0 0;
  color: var(--text-500);
}

.auth-form {
  margin-top: 20px;
  display: grid;
  gap: 10px;
}

.field-label {
  font-size: 0.84rem;
  color: var(--text-700);
  font-weight: 600;
}

.field-input {
  width: 100%;
  border: 1px solid #d8dfd4;
  border-radius: 10px;
  min-height: 44px;
  padding: 10px 12px;
  font: inherit;
  background: #fff;
  color: var(--text-900);
}

.field-input:focus {
  outline: 2px solid rgba(31, 157, 103, 0.18);
  border-color: var(--brand-500);
}

.password-wrap {
  position: relative;
}

.password-wrap .field-input {
  padding-right: 66px;
}

.toggle-btn {
  position: absolute;
  top: 50%;
  right: 9px;
  transform: translateY(-50%);
  border: none;
  border-radius: 8px;
  background: var(--brand-100);
  color: var(--brand-600);
  padding: 5px 9px;
  font-size: 0.78rem;
  cursor: pointer;
}

.submit-btn {
  margin-top: 8px;
  border: none;
  border-radius: 12px;
  min-height: 46px;
  font: inherit;
  font-weight: 700;
  color: #f3fff8;
  cursor: pointer;
  background: linear-gradient(135deg, var(--brand-500), #2ab57a);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-foot {
  margin-top: 16px;
  font-size: 0.9rem;
  color: var(--text-700);
}

.auth-foot a {
  margin-left: 6px;
  color: var(--brand-600);
  font-weight: 700;
  text-decoration: none;
}

.demo-box {
  margin-top: 16px;
  padding: 14px;
  border-radius: 12px;
  background: var(--surface-2);
}

.demo-box h3 {
  margin: 0 0 6px;
  font-size: 0.92rem;
}

.demo-box p {
  margin: 4px 0;
  font-family: 'Space Grotesk', monospace;
  font-size: 0.84rem;
  color: var(--text-700);
}

@media (max-width: 960px) {
  .auth-grid {
    grid-template-columns: 1fr;
  }
}
</style>
