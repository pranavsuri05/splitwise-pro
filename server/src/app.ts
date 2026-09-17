import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFoundHandler.js'
import { healthRouter } from './routes/health.routes.js'

export function createApp(): Express {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? true }))
  app.use(express.json())

  app.use('/api', healthRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
