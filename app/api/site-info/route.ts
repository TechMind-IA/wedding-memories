/**
 * Nome: app/api/site-info/route.ts
 * Função: Retorna informações do site (nomes, data, WhatsApp) do admin_config.
 */

import { NextResponse } from "next/server"
import { getConfig } from "@/lib/db"

export const runtime = "edge"

export async function GET() {
  try {
    const [coupleNames, weddingDate, whatsappNumber] = await Promise.all([
      getConfig("couple_names"),
      getConfig("wedding_date"),
      getConfig("whatsapp_number"),
    ])

    return NextResponse.json({
      coupleNames: coupleNames || "Brenda & Jonathas",
      weddingDate: weddingDate || "10.10.26",
      whatsappNumber: whatsappNumber || "",
    })
  } catch (error) {
    console.error("[api/site-info] Erro:", error)
    return NextResponse.json({
      coupleNames: "Brenda & Jonathas",
      weddingDate: "10.10.26",
      whatsappNumber: "",
    })
  }
}
