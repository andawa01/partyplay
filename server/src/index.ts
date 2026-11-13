import express from 'express'
import cors from 'cors'
import 'dotenv/config'

import { z } from 'zod'
import { db, ensureClient } from './config/db'

const app = express()
const PORT = Number(process.env.PORT ?? 4000)

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }))
app.use(express.json())

const healthCheckSchema = z.object({
  ok: z.literal(true),
})

app.get('/api/health', async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return res.status(503).json({ status: 'error', service: 'partyplay-api', error: 'database unavailable' })
  }
  res.json({ status: 'ok', service: 'partyplay-api' })
})

app.get('/api/hello', (req, res) => {
  const input = z.object({ name: z.string().min(1).max(50) }).safeParse(req.query)
  if (!input.success) {
    return res.status(400).json({ error: 'Provide a ?name=... query string' })
  }
  res.json({ message: `Hello, ${input.data.name}!` })
})

// Mount route files
import categoriesRouter from './routes/categories'
app.use('/api/categories', categoriesRouter)

// Ensure the database is connected before we start listening for traffic.
ensureClient()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PartyPlay API listening on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

