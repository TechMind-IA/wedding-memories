/**
 * Nome: app/api/migrate/route.ts
 * Função: Implementa a rota de API migrate do backend Next.js.
 */

import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/db"

/**
 * Rota para inicializar o banco de dados.
 * Chame uma única vez: GET /api/migrate
 *
 * Proteja esta rota em produção com um secret header,
 * ou rode o script scripts/migrate.ts diretamente.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("x-migrate-secret")
  const expectedSecret = process.env.MIGRATE_SECRET

  // Em desenvolvimento, permite sem secret
  if (process.env.NODE_ENV !== "production") {
    // Permitir sem auth em dev
  } else if (!expectedSecret) {
    return NextResponse.json(
      { error: "MIGRATE_SECRET não configurado. Defina esta variável de ambiente em produção." },
      { status: 500 }
    )
  } else if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    await initializeDatabase()
    return NextResponse.json({ message: "Banco de dados inicializado com sucesso!" })
  } catch (error) {
    console.error("[api/migrate] Erro na migração:", error)
    return NextResponse.json(
      { error: "Falha na migração do banco de dados" },
      { status: 500 }
    )
  }
}