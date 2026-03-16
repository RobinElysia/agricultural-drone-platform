// 无人机增删改查功能测试脚本
import axios from 'axios'

const API_BASE = 'http://localhost:3000/api'
let authToken = ''

// 测试用户登录
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    })
    
    if (response.data.code === 200) {
      authToken = response.data.data.token
      console.log('✅ 登录成功')
      return true
    }
  } catch (error: any) {
    console.error('❌ 登录失败:', error.response?.data || error.message)
    return false
  }
}

// 获取所有无人机
async function getAllDrones() {
  try {
    const response = await axios.get(`${API_BASE}/drones`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    console.log('\n📋 获取所有无人机:')
    console.log(`总数: ${response.data.data.length}`)
    response.data.data.forEach((drone: any) => {
      console.log(`  - ${drone.name} (${drone.id}): ${drone.status}, 电量${drone.battery}%`)
    })
    return response.data.data
  } catch (error: any) {
    console.error('❌ 获取无人机列表失败:', error.response?.data || error.message)
    return []
  }
}

// 创建无人机
async function createDrone(name: string) {
  try {
    const response = await axios.post(`${API_BASE}/drones`, {
      name,
      battery: 100,
      motorSpeed: 0,
      load: 10,
      status: 'online',
      position: { lat: 39.9, lng: 116.4 }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    console.log(`\n✅ 创建无人机成功: ${response.data.data.name} (${response.data.data.id})`)
    return response.data.data
  } catch (error: any) {
    console.error('❌ 创建无人机失败:', error.response?.data || error.message)
    return null
  }
}

// 获取单个无人机
async function getDrone(id: string) {
  try {
    const response = await axios.get(`${API_BASE}/drones/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    console.log(`\n📄 获取无人机详情: ${response.data.data.name}`)
    console.log(`  状态: ${response.data.data.status}`)
    console.log(`  电量: ${response.data.data.battery}%`)
    console.log(`  载荷: ${response.data.data.load}L`)
    return response.data.data
  } catch (error: any) {
    console.error('❌ 获取无人机详情失败:', error.response?.data || error.message)
    return null
  }
}

// 更新无人机
async function updateDrone(id: string, updates: any) {
  try {
    const response = await axios.put(`${API_BASE}/drones/${id}`, updates, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    console.log(`\n✅ 更新无人机成功: ${response.data.data.name}`)
    console.log(`  新状态: ${response.data.data.status}`)
    console.log(`  新电量: ${response.data.data.battery}%`)
    return response.data.data
  } catch (error: any) {
    console.error('❌ 更新无人机失败:', error.response?.data || error.message)
    return null
  }
}

// 删除无人机
async function deleteDrone(id: string) {
  try {
    const response = await axios.delete(`${API_BASE}/drones/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    console.log(`\n✅ 删除无人机成功: ${id}`)
    return true
  } catch (error: any) {
    console.error('❌ 删除无人机失败:', error.response?.data || error.message)
    return false
  }
}

// 控制无人机
async function controlDrone(id: string, operation: string) {
  try {
    const response = await axios.post(`${API_BASE}/drones/${id}/control`, {
      operation,
      params: {}
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    console.log(`\n✅ 控制无人机成功: ${operation}`)
    console.log(`  操作ID: ${response.data.data.id}`)
    return response.data.data
  } catch (error: any) {
    console.error('❌ 控制无人机失败:', error.response?.data || error.message)
    return null
  }
}

// 主测试流程
async function runTests() {
  console.log('=== 无人机增删改查功能测试 ===\n')
  
  // 1. 登录
  const loginSuccess = await login()
  if (!loginSuccess) {
    console.error('登录失败，测试终止')
    return
  }
  
  // 2. 获取初始无人机列表
  await getAllDrones()
  
  // 3. 创建新无人机
  const newDrone = await createDrone('测试无人机-001')
  if (!newDrone) return
  
  // 4. 获取新创建的无人机详情
  await getDrone(newDrone.id)
  
  // 5. 更新无人机信息
  await updateDrone(newDrone.id, {
    battery: 85,
    status: 'flying',
    motorSpeed: 2500
  })
  
  // 6. 控制无人机
  await controlDrone(newDrone.id, 'takeoff')
  
  // 7. 再次获取所有无人机
  await getAllDrones()
  
  // 8. 删除测试无人机
  await deleteDrone(newDrone.id)
  
  // 9. 确认删除
  await getAllDrones()
  
  console.log('\n=== 测试完成 ===')
}

// 运行测试
runTests().catch(console.error)
