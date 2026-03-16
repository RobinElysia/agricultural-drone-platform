import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: '数据大屏', requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('@/views/UsersView.vue'),
    meta: { title: '用户管理', requiresAuth: true, role: ['admin'] }
  },
  {
    path: '/drones',
    name: 'Drones',
    component: () => import('@/views/DronesView.vue'),
    meta: { title: '无人机管理', requiresAuth: true, role: ['admin', 'operator'] }
  },
  {
    path: '/ai-chat',
    name: 'AIChat',
    component: () => import('@/views/AIChatView.vue'),
    meta: { title: 'AI 助手', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面未找到' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  document.title = title ? `${title} - 农业无人机平台` : '农业无人机平台'

  const requiresAuth = to.meta.requiresAuth as boolean
  if (requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) {
      next({ name: 'Login' })
      return
    }

    const requiredRole = to.meta.role as string[] | undefined
    if (requiredRole) {
      const userRole = localStorage.getItem('userRole') || ''
      if (!requiredRole.includes(userRole)) {
        next({ name: 'Home' })
        return
      }
    }
  }

  next()
})

export default router
