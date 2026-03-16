<template>
  <div class="page-shell register-page">
    <section class="frost-card register-card">
      <header class="register-head">
        <h1>创建新账号</h1>
        <p>用于农业无人机作业平台的账号注册</p>
      </header>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="register-form"
        @submit.prevent="handleRegister"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isLoading" clearable />
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入真实姓名" :disabled="isLoading" clearable />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            :disabled="isLoading"
            clearable
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入密码"
            :disabled="isLoading"
            clearable
          />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" :disabled="isLoading" clearable>
            <el-option label="管理员" value="admin" />
            <el-option label="操作员" value="operator" />
            <el-option label="农业员" value="agriculturalist" />
          </el-select>
          <div class="role-help">
            <p><strong>管理员：</strong>管理用户与平台配置</p>
            <p><strong>操作员：</strong>执行无人机飞行与作业任务</p>
            <p><strong>农业员：</strong>查看作业数据与进度</p>
          </div>
        </el-form-item>

        <el-button native-type="submit" type="primary" size="large" class="w-full" :loading="isLoading">
          {{ isLoading ? '注册中...' : '注册账号' }}
        </el-button>
      </el-form>

      <footer class="register-foot">
        <span>已有账号？</span>
        <router-link to="/login">返回登录</router-link>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import type { UserRole } from '@/types'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const isLoading = ref(false)

const form = reactive({
  username: '',
  name: '',
  password: '',
  confirmPassword: '',
  role: '' as UserRole
})

const validatePassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
    return
  }
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
    return
  }
  callback()
}

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [{ validator: validatePassword, trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const handleRegister = async () => {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  isLoading.value = true
  const ok = await userStore.register(form.username, form.password, form.role, form.name)

  if (ok) {
    ElMessage.success('注册成功，正在跳转登录页')
    setTimeout(() => router.push('/login'), 1200)
  } else {
    ElMessage.error(userStore.error || '注册失败，请稍后重试')
  }

  isLoading.value = false
}
</script>

<style scoped>
.register-page {
  display: flex;
  align-items: center;
  justify-content: center;
}

.register-card {
  width: min(560px, 100%);
  padding: 24px;
}

.register-head {
  margin-bottom: 10px;
}

.register-head h1 {
  margin: 0;
  font-size: 1.5rem;
}

.register-head p {
  margin: 8px 0 0;
  color: var(--text-500);
}

.register-form {
  margin-top: 8px;
}

.register-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--text-700);
}

.role-help {
  margin-top: 10px;
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--surface-2);
}

.role-help p {
  margin: 4px 0;
  font-size: 0.82rem;
  color: var(--text-700);
}

.register-foot {
  margin-top: 14px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-700);
}

.register-foot a {
  margin-left: 6px;
  color: var(--brand-600);
  font-weight: 700;
  text-decoration: none;
}
</style>
