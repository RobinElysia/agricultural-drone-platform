<template>
  <div class="users-container">
    <el-container>
      <el-header class="header">
        <div class="header-content">
          <div>
            <h1>人员管理</h1>
            <p>系统用户账户与权限管理</p>
          </div>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </el-header>

      <el-main>
        <el-card>
          <template #header>
            <div class="card-header">
              <span>用户列表</span>
              <el-button type="primary" @click="showAddModal = true">+ 添加用户</el-button>
            </div>
          </template>

          <el-table :data="users" stripe>
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column label="角色" width="100">
              <template #default="{ row }">
                <el-tag :type="getRoleType(row.userRole)">{{ row.userRole }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="180">
              <template #default="{ row }">
                {{ row.createdAt ? formatDate(row.createdAt) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="editUser(row)">编辑</el-button>
                <el-popconfirm
                  title="确定删除该用户吗？"
                  @confirm="deleteUser(row.username)"
                  confirm-button-text="确定"
                  cancel-button-text="取消"
                >
                  <template #reference>
                    <el-button type="danger" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>

    <!-- Add/Edit User Modal -->
    <el-dialog
      v-model="showAddModal"
      :title="editingUser ? '编辑用户' : '添加用户'"
      width="50%"
    >
      <el-form :model="userForm" label-width="100px">
        <el-form-item label="用户名">
          <el-input
            v-model="userForm.username"
            :disabled="!!editingUser"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="userForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" :required="!editingUser">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.userRole" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="操作员" value="operator" />
            <el-option label="农业员" value="agriculturalist" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddModal = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { authAPI } from '@/api'
import type { UserInfo } from '@/types'
import dayjs from 'dayjs'

const users = ref<UserInfo[]>([])
const showAddModal = ref(false)
const editingUser = ref<UserInfo | null>(null)

const userForm = reactive({
  username: '',
  name: '',
  password: '',
  userRole: 'operator' as 'admin' | 'operator' | 'agriculturalist'
})

const getRoleType = (role: string): string => {
  const map: Record<string, string> = {
    'admin': 'danger',
    'operator': 'warning',
    'agriculturalist': 'success'
  }
  return map[role] || 'info'
}

const formatDate = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const fetchUsers = async () => {
  try {
    const response = await authAPI.getUsers()
    if (response.code && response.data) {
      users.value = response.data
    }
  } catch (error) {
    ElMessage.error('获取用户列表失败')
    users.value = []
  }
}

const editUser = (user: UserInfo) => {
  editingUser.value = user
  userForm.username = user.username
  userForm.name = user.name
  userForm.password = ''
  userForm.userRole = user.userRole
  showAddModal.value = true
}

const deleteUser = async (username: string) => {
  try {
    await authAPI.deleteUser(username)
    ElMessage.success('用户删除成功')
    await fetchUsers()
  } catch (error) {
    ElMessage.error('删除用户失败')
  }
}

const saveUser = async () => {
  if (!userForm.username || !userForm.name || (!editingUser.value && !userForm.password)) {
    ElMessage.warning('请填写完整信息')
    return
  }

  try {
    if (editingUser.value) {
      // Update user
      await authAPI.updateUser(editingUser.value.username, {
        name: userForm.name,
        userRole: userForm.userRole,
        ...(userForm.password && { password: userForm.password })
      })
      ElMessage.success('用户更新成功')
    } else {
      // Create new user
      await authAPI.createUser({
        username: userForm.username,
        password: userForm.password,
        name: userForm.name,
        userRole: userForm.userRole
      })
      ElMessage.success('用户创建成功')
    }
    closeModal()
    await fetchUsers()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingUser.value = null
  userForm.username = ''
  userForm.name = ''
  userForm.password = ''
  userForm.userRole = 'operator'
}

onMounted(async () => {
  await fetchUsers()
})
</script>

<style scoped>
.users-container {
  min-height: 100vh;
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>
