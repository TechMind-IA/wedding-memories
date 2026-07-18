/**
 * Nome: lib/rate-limit.ts
 * Função: Rate limiting DB-backed para proteger endpoints.
 * Usa a tabela rate_limit_attempts no PostgreSQL.
 */

import { neon } from "@neondatabase/serverless"

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definido no .env.local")
  const url = process.env.DATABASE_URL.split("?")[0]
  return neon(url)
}

/**
 * Verifica se o request excedeu o limite de tentativas.
 * Retorna true se permitido, false se bloqueado.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 5 * 60 * 1000
): Promise<boolean> {
  const sql = getDb()
  const windowStart = new Date(Date.now() - windowMs)

  await sql`DELETE FROM rate_limit_attempts WHERE window_start < ${windowStart}`

  const rows = await sql`
    SELECT COALESCE(SUM(count), 0)::int AS total
    FROM rate_limit_attempts
    WHERE key = ${key} AND window_start >= ${windowStart}
  `
  const current = Number(rows[0]?.total ?? 0)

  if (current >= maxAttempts) {
    return false
  }

  await sql`
    INSERT INTO rate_limit_attempts (key, count, window_start)
    VALUES (${key}, 1, NOW())
  `
  return true
}

/**
 * Retorna o tempo restante em segundos até poder tentar novamente.
 */
export async function getRateLimitRemaining(key: string): Promise<number> {
  const sql = getDb()
  const rows = await sql`
    SELECT MAX(window_start) AS latest
    FROM rate_limit_attempts
    WHERE key = ${key}
  `
  const latest = rows[0]?.latest
  if (!latest) return 0
  const windowMs = 5 * 60 * 1000
  const elapsed = Date.now() - new Date(latest).getTime()
  const remaining = Math.max(0, windowMs - elapsed)
  return Math.ceil(remaining / 1000)
}
