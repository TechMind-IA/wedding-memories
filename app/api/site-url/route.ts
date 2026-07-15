/**
 * Nome: app/api/site-url/route.ts
 * Função: Retorna automaticamente a URL atual do site.
 */

import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const host = request.headers.get("host")
  const protocol = request.headers.get("x-forwarded-proto") ?? "https"
  const url = `${protocol}://${host}`

  return NextResponse.json({ url })
}
