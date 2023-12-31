import fastify from 'fastify'
import cookie from '@fastify/cookie'
import { transactionsRoutes } from './routes/transactions'
import cors from '@fastify/cors'

export const app = fastify()

app.register(cors, {
  origin: ['https://transactions-omega.vercel.app'],
  credentials: true,
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
  exposedHeaders: ['set-cookie'],
})

app.register(cookie)

app.register(transactionsRoutes, {
  prefix: 'transactions',
})
