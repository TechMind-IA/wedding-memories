/**
 * Nome: lib/rate-limit.ts
 * Função: Rate limiting simples em memória para proteger endpoints.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 60_000 // Limpa a cada 1 minuto

let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
}

/**
 * Verifica se o request excedeu o limite de tentativas.
 * Retorna true se permitido, false se bloqueado.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 5 * 60 * 1000 // 5 minutos
): boolean {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (entry.count >= maxAttempts) {
    return false
  }

  entry.count++
  return true
}

/**
 * Retorna o tempo restante em segundos até poder tentar novamente.
 */
export function getRateLimitRemaining(key: string): number {
  const entry = store.get(key)
  if (!entry) return 0
  const remaining = Math.max(0, entry.resetTime - Date.now())
  return Math.ceil(remaining / 1000)
}
