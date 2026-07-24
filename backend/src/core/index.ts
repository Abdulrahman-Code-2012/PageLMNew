// backend/src/core/index.ts
import fs from 'fs'
import cors from 'cors'
import path from 'path'
import server from '../utils/server/server'
import { registerRoutes } from './router'
import { loggerMiddleware } from './middleware'

// Load environment variables only if .env exists (local only)
const envPath = path.resolve(process.cwd(), '.env')

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

const app = server()

// Middleware
app.use(loggerMiddleware)

app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.options('*', cors())

app.use(app.serverStatic("/storage", "./storage"))

// Register routes
registerRoutes(app)

// Export for Vercel
export default app


// Start server locally
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  const PORT = Number.parseInt(process.env.PORT || '5000')

  app.listen(PORT, () => {
    console.log(
      `[pagelm] running on ${process.env.VITE_BACKEND_URL || `http://localhost:${PORT}`}`
    )
  })
}


// Start server on Render
if (require.main === module) {
  const PORT = Number.parseInt(process.env.PORT || '5000')

  app.listen(PORT, () => {
    console.log(
      `[pagelm] running on ${process.env.VITE_BACKEND_URL || `http://localhost:${PORT}`}`
    )
  })
}
