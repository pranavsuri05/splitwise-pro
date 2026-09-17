// Local development convenience seed: creates one demo group with a few
// people and the default categories, so migrations can be verified manually.
// Not used by the application itself.
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Pool } = pg

const defaultCategories = JSON.parse(
  readFileSync(fileURLToPath(new URL('./default-categories.json', import.meta.url)), 'utf-8'),
)

const demoPeople = ['Sidhant', 'Rahul', 'Arjun']

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Configure server/.env before seeding.')
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const groupResult = await client.query(
      'INSERT INTO groups (name) VALUES ($1) RETURNING id, name',
      ['Demo Group'],
    )
    const group = groupResult.rows[0]

    for (const name of demoPeople) {
      await client.query('INSERT INTO people (group_id, name) VALUES ($1, $2)', [group.id, name])
    }

    for (const name of defaultCategories) {
      await client.query('INSERT INTO categories (group_id, name) VALUES ($1, $2)', [
        group.id,
        name,
      ])
    }

    await client.query('COMMIT')
    console.log(
      `Seeded "${group.name}" (${group.id}) with ${demoPeople.length} people and ${defaultCategories.length} categories.`,
    )
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
