// Application configuration
export const config = {
  // Server settings
  server: {
    port: process.env.PORT || 8080,
    host: process.env.HOST || 'localhost',
    bodyLimit: process.env.BODY_LIMIT || '10mb'
  },

  // Redis settings
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },

  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Qianwen API settings
  qianwen: {
    apiKey: process.env.QIANWEN_API_KEY || '',
    baseUrl:
      process.env.QIANWEN_BASE_URL ||
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
  },

  // AMap weather API settings
  amap: {
    key: process.env.AMAP_KEY || '',
    city: process.env.AMAP_CITY || '210100'
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // Rate limit settings
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },

  // WebSocket settings
  websocket: {
    port: process.env.WS_PORT || 8081,
    path: '/ws'
  },

  // YOLO service settings
  yolo: {
    baseUrl: process.env.YOLO_BASE_URL || 'http://127.0.0.1:5000',
    timeout: parseInt(process.env.YOLO_TIMEOUT || '20000', 10)
  }
}

// Validate required environment variables
export const validateConfig = () => {
  const errors: string[] = []

  if (!config.jwt.secret || config.jwt.secret === 'your-secret-key-change-in-production') {
    errors.push('JWT_SECRET environment variable is required')
  }

  if (errors.length > 0) {
    console.error('Configuration errors:', errors)
    process.exit(1)
  }

  return true
}
