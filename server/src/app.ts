import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFoundHandler.js'
import { balancesRouter } from './routes/balances.routes.js'
import { categoriesRouter } from './routes/categories.routes.js'
import { expensesRouter } from './routes/expenses.routes.js'
import { groupsRouter } from './routes/groups.routes.js'
import { healthRouter } from './routes/health.routes.js'
import { peopleRouter } from './routes/people.routes.js'
import { settlementsRouter } from './routes/settlements.routes.js'

export function createApp(): Express {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? true }))
  app.use(express.json())

  app.use('/api', healthRouter)
  app.use('/api/groups/:groupId/people', peopleRouter)
  app.use('/api/groups/:groupId/categories', categoriesRouter)
  app.use('/api/groups/:groupId/expenses', expensesRouter)
  app.use('/api/groups/:groupId/balances', balancesRouter)
  app.use('/api/groups/:groupId/settlements', settlementsRouter)
  app.use('/api/groups', groupsRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
