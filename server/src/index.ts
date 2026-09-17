import 'dotenv/config'
import { createApp } from './app.js'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Configure server/.env before starting the server.')
}

const port = Number(process.env.PORT ?? 4000)
const app = createApp()

app.listen(port, () => {
  console.log(`Splitwise Pro API listening on port ${port}`)
})
