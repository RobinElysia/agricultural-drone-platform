import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config, validateConfig } from './config'
import redisManager from './utils/redis'
import redisService from './services/redis'
import { ResponseUtil } from './utils/response'
import { authenticate, requestLogger, errorHandler } from './middleware/auth'
import { generalRateLimit, authRateLimit, aiRateLimit, droneControlRateLimit } from './middleware/rateLimit'

// Route imports
import authRoutes from './routes/auth'
import droneRoutes from './routes/drone'
import environmentRoutes from './routes/environment'
import aiRoutes from './routes/ai'
import dashboardRoutes from './routes/dashboard'
import targetRoutes from './routes/target'
import yoloRoutes, { yoloPublicRoutes } from './routes/yolo'

// Create Express app
const app = express()

// Validate configuration
validateConfig()

// Middleware
app.use(helmet())
app.use(cors(config.cors))
app.use(express.json({ limit: config.server.bodyLimit }))
app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }))
app.use(requestLogger)

// Rate limits
app.use('/api/ai', aiRateLimit)
app.use('/api/drones', droneControlRateLimit)
app.use('/api', generalRateLimit)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/drones', authenticate, droneRoutes)
app.use('/api/environment', authenticate, environmentRoutes)
app.use('/api/ai', authenticate, aiRoutes)
app.use('/api/dashboard', authenticate, dashboardRoutes)
app.use('/api/targets', authenticate, targetRoutes)
app.use('/api/yolo', yoloPublicRoutes)
app.use('/api/yolo', authenticate, yoloRoutes)

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const redisHealth = await redisManager.ping()

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      redis: redisHealth === 'PONG' ? 'connected' : 'disconnected',
      version: '1.0.0'
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Redis connection failed'
    })
  }
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json(ResponseUtil.notFound('Endpoint not found'))
})

// Error handler
app.use(errorHandler)

// Start server
async function startServer() {
  try {
    // Connect Redis
    await redisManager.connect()

    // Create default admin if missing
    const adminUser = await redisService.getUserByUsername('admin')
    if (!adminUser) {
      console.log('Creating default admin user...')
      const bcrypt = (await import('bcryptjs')).default
      const hashedPassword = await bcrypt.hash('admin123', 10)

      const { ModelFactory } = await import('./models')
      const admin = ModelFactory.createUser({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        name: 'System Administrator'
      })

      await redisService.saveUser(admin)
      console.log('Default admin user created: admin / admin123')
    }

    // Start HTTP server
    app.listen(config.server.port, config.server.host, () => {
      console.log(`Server running at http://${config.server.host}:${config.server.port}`)
      console.log(`Health check: http://${config.server.host}:${config.server.port}/health`)
      console.log(`API base: http://${config.server.host}:${config.server.port}/api`)
    })
  } catch (error) {
    console.error('Server startup failed:', error)
    process.exit(1)
  }
}

// Boot
startServer()

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Shutting down server...')
  await redisManager.disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down server...')
  await redisManager.disconnect()
  process.exit(0)
})
