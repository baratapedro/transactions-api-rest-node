import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function transactionsRoutes(app: FastifyInstance) {
  // exemplo de middleware para todas as rotas desse contexto
  app.addHook('preHandler', async (request, reply) => {
    console.log(`${request.method} ${request.url}`)
  })

  app.post('/', async (request, reply) => {
    const transactionSchema = z.object({
      text: z.string(),
      amount: z.number(),
      // type: z.enum(['credit', 'debit']),
    })

    const { text, amount } = transactionSchema.parse(request.body)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        domain: '.transactions-omega.vercel.app',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: false,
      })

      reply.header('Access-Control-Allow-Credentials', true)
      reply.header(
        'Access-Control-Allow-Origin',
        'https://transactions-omega.vercel.app',
      )
    }

    await knex('transactions').insert({
      id: randomUUID(),
      text,
      amount,
      session_id: sessionId,
    })

    return reply.status(201).send(sessionId)
  })

  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies

      const transactions = await knex('transactions')
        .select()
        .where('session_id', sessionId)
        .orderBy('created_at', 'desc')

      return {
        transactions,
      }
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const transactionParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = transactionParamsSchema.parse(request.params)

      const { sessionId } = request.cookies

      const transaction = await knex('transactions')
        .where({
          id,
          session_id: sessionId,
        })
        .first()

      return {
        transaction,
      }
    },
  )

  app.get(
    '/summary',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const summary = await knex('transactions')
        .select(
          knex('transactions')
            .where('amount', '>', 0)
            .andWhere('session_id', sessionId)
            .sum('amount')
            .as('credit'),
          knex('transactions')
            .where('amount', '<', 0)
            .andWhere('session_id', sessionId)
            .sum('amount')
            .as('debit'),
          knex('transactions')
            .sum('amount')
            .as('amount')
            .where('session_id', sessionId),
        )
        .first()

      return {
        summary,
      }
    },
  )

  app.delete('/:id', async (request, reply) => {
    const transactionParamsSchema = z.object({
      id: z.string(),
    })

    const { id } = transactionParamsSchema.parse(request.params)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('transactions').delete().where({
      id,
    })

    return reply.status(204).send()
  })
}
