<template>
  <div class="drones-container">
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <h1>无人机管理</h1>
          <p>管理无人机设备档案与状态</p>
        </div>
        <el-button @click="$router.back()">返回</el-button>
      </el-header>

      <el-main>
        <!-- Statistics -->
        <el-row :gutter="20" class="mb-24">
          <el-col :xs="12" :sm="12" :md="6">
            <el-statistic title="总无人机" :value="droneStore.totalDrones" />
          </el-col>
          <el-col :xs="12" :sm="12" :md="6">
            <el-statistic title="在线" :value="droneStore.onlineDrones.length" />
          </el-col>
          <el-col :xs="12" :sm="12" :md="6">
            <el-statistic title="飞行中" :value="droneStore.flyingDrones.length" />
          </el-col>
          <el-col :xs="12" :sm="12" :md="6">
            <el-statistic title="平均电量" :value="`${droneStore.avgBattery}%`" />
          </el-col>
        </el-row>

        <!-- Table -->
        <el-card>
          <template #header>
            <div class="card-header">
              <span>无人机列表</span>
              <el-button type="primary" @click="showAddModal = true">+ 添加无人机</el-button>
            </div>
          </template>

          <el-table :data="droneStore.drones" stripe>
            <el-table-column prop="name" label="名称" width="120" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getDroneStatusType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="电量" width="150">
              <template #default="{ row }">
                <el-progress :percentage="row.battery" :color="getBatteryColor(row.battery)" />
              </template>
            </el-table-column>
            <el-table-column prop="motorSpeed" label="电机转速(RPM)" width="130" />
            <el-table-column prop="load" label="载荷(L)" width="100" />
            <el-table-column label="位置" width="200">
              <template #default="{ row }">
                <span>{{ row.position.lat.toFixed(4) }}, {{ row.position.lng.toFixed(4) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="editDrone(row)">编辑</el-button>
                <el-popconfirm
                  title="确定删除该无人机吗？"
                  @confirm="deleteDrone(row.id)"
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

    <!-- Add/Edit Modal -->
    <el-dialog
      v-model="showAddModal"
      :title="editingDrone ? '编辑无人机' : '添加无人机'"
      width="50%"
    >
      <el-form :model="droneForm" label-width="100px">
        <el-form-item label="名称">
          <el-input v-model="droneForm.name" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="droneForm.status">
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
            <el-option label="充电中" value="charging" />
            <el-option label="飞行中" value="flying" />
          </el-select>
        </el-form-item>
        <el-form-item label="电量 (%)">
          <el-input-number v-model="droneForm.battery" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="电机转速 (RPM)">
          <el-input-number v-model="droneForm.motorSpeed" :min="0" />
        </el-form-item>
        <el-form-item label="载荷 (L)">
          <el-input-number v-model="droneForm.load" :min="0" />
        </el-form-item>
        <el-form-item label="纬度">
          <el-input-number v-model="droneForm.lat" :step="0.0001" />
        </el-form-item>
        <el-form-item label="经度">
          <el-input-number v-model="droneForm.lng" :step="0.0001" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddModal = false">取消</el-button>
        <el-button type="primary" @click="saveDrone">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useDroneStore } from '@/store/drone'
import { ElMessage } from 'element-plus'
import type { DroneStatus } from '@/types'

const droneStore = useDroneStore()

const showAddModal = ref(false)
const editingDrone = ref<DroneStatus | null>(null)

const droneForm = reactive({
  name: '',
  status: 'online' as DroneStatus['status'],
  battery: 100,
  motorSpeed: 0,
  load: 0,
  lat: 39.9,
  lng: 116.4
})

onMounted(async () => {
  await droneStore.fetchDrones()
})

const getDroneStatusType = (status: DroneStatus['status']): string => {
  const map: Record<string, string> = {
    'online': 'success',
    'offline': 'danger',
    'charging': 'warning',
    'flying': 'info'
  }
  return map[status] || 'info'
}

const getBatteryColor = (battery: number): string | string[] => {
  if (battery > 50) return '#67c23a'
  if (battery > 20) return '#e6a23c'
  return '#f56c6c'
}

const editDrone = (drone: DroneStatus) => {
  editingDrone.value = drone
  droneForm.name = drone.name
  droneForm.status = drone.status
  droneForm.battery = drone.battery
  droneForm.motorSpeed = drone.motorSpeed
  droneForm.load = drone.load
  droneForm.lat = drone.position.lat
  droneForm.lng = drone.position.lng
  showAddModal.value = true
}

const deleteDrone = async (id: string) => {
  const success = await droneStore.deleteDrone(id)
  if (success) {
    ElMessage.success('无人机删除成功')
  } else {
    ElMessage.error('删除失败')
  }
}

const saveDrone = async () => {
  if (!droneForm.name) {
    ElMessage.warning('请输入无人机名称')
    return
  }
  
  const droneData: Partial<DroneStatus> = {
    name: droneForm.name,
    status: droneForm.status,
    battery: droneForm.battery,
    motorSpeed: droneForm.motorSpeed,
    load: droneForm.load,
    position: {
      lat: droneForm.lat,
      lng: droneForm.lng
    },
    lastUpdate: new Date().toISOString()
  }
  
  try {
    if (editingDrone.value) {
      await droneStore.updateDrone(editingDrone.value.id, droneData)
      ElMessage.success('无人机更新成功')
    } else {
      await droneStore.createDrone(droneData)
      ElMessage.success('无人机添加成功')
    }
    closeModal()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingDrone.value = null
  droneForm.name = ''
  droneForm.status = 'online'
  droneForm.battery = 100
  droneForm.motorSpeed = 0
  droneForm.load = 0
  droneForm.lat = 39.9
  droneForm.lng = 116.4
}
</script>

<style scoped>
.drones-container {
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #ebeef5;
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.header-left p {
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

.mb-24 {
  margin-bottom: 24px;
}
</style>