/**
 * Nome: scripts/migrate-multitenancy.ts
 * Função: Migra o banco de dados existente (single-tenant) para multi-tenant.
 *
 * Executar com: npx tsx scripts/migrate-multitenancy.ts
 * Requer variável de ambiente SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD.
 */

import { neon } from "@neondatabase/serverless"
import { randomBytes } from "crypto"
import { hash } from "bcryptjs"
import { readFileSync } from "fs"
import { resolve } from "path"

try {
  const envFile = readFileSync(resolve(__dirname, "../.env"), "utf-8")
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
    if (!process.env[key]) process.env[key] = val
  }
} catch { /* .env not found, rely on environment */ }

const SALT_ROUNDS = 10

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definido")
  }
  let url = process.env.DATABASE_URL
  url = url.split("?")[0]
  return neon(url)
}

function generateAccessCode(): string {
  return randomBytes(6).toString("hex") // 12 hex chars
}

async function migrate() {
  const sql = getDb()

  console.log("🚀 Iniciando migração multi-tenant...\n")

  // ── 1. Criar tabela weddings ────────────────────────────────────────────────
  console.log("1/8 Criando tabela weddings...")
  await sql`
    CREATE TABLE IF NOT EXISTS weddings (
      id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      access_code    TEXT        NOT NULL UNIQUE,
      slug           TEXT        NOT NULL UNIQUE,
      couple_names   TEXT        NOT NULL,
      wedding_date   TEXT,
      theme_color    TEXT        DEFAULT '#C2754F',
      is_active      BOOLEAN     DEFAULT TRUE,
      created_at     TIMESTAMP   DEFAULT NOW() NOT NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_weddings_access_code ON weddings (access_code)`
  await sql`CREATE INDEX IF NOT EXISTS idx_weddings_slug ON weddings (slug)`
  console.log("   ✅ Tabela weddings criada\n")

  // ── 2. Criar tabela super_admins ────────────────────────────────────────────
  console.log("2/8 Criando tabela super_admins...")
  await sql`
    CREATE TABLE IF NOT EXISTS super_admins (
      id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      email          TEXT        NOT NULL UNIQUE,
      password_hash  TEXT        NOT NULL,
      created_at     TIMESTAMP   DEFAULT NOW() NOT NULL
    )
  `
  console.log("   ✅ Tabela super_admins criada\n")

  // ── 2b. Criar tabela super_admin_sessions ───────────────────────────────────
  console.log("2b/9 Criando tabela super_admin_sessions...")
  await sql`
    CREATE TABLE IF NOT EXISTS super_admin_sessions (
      token        TEXT        PRIMARY KEY,
      expires_at   TIMESTAMP   NOT NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_expires ON super_admin_sessions (expires_at)`
  console.log("   ✅ Tabela super_admin_sessions criada\n")

  // ── 2c. Criar tabela rate_limit_attempts ────────────────────────────────────
  console.log("2c/9 Criando tabela rate_limit_attempts...")
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limit_attempts (
      key          TEXT        NOT NULL,
      count        INTEGER     NOT NULL DEFAULT 1,
      window_start TIMESTAMP   NOT NULL DEFAULT NOW(),
      PRIMARY KEY (key, window_start)
    )
  `
  console.log("   ✅ Tabela rate_limit_attempts criada\n")

  // ── 3. Criar super-admin padrão ─────────────────────────────────────────────
  console.log("3/8 Criando super-admin padrão...")
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@wedding-memories.com"
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "admin123"
  const passwordHash = await hash(adminPassword, SALT_ROUNDS)

  await sql`
    INSERT INTO super_admins (email, password_hash)
    VALUES (${adminEmail}, ${passwordHash})
    ON CONFLICT (email) DO NOTHING
  `
  console.log(`   ✅ Super-admin criado: ${adminEmail}\n`)

  // ── 4. Inserir casamento existente (Brenda & Jonathas) ──────────────────────
  console.log("4/8 Inserindo casamento existente...")
  const accessCode = generateAccessCode()
  const slug = "brendaejonathas"
  const coupleNames = process.env.COUPLE_NAMES || "Brenda & Jonathas"
  const weddingDate = process.env.WEDDING_DATE || "10.10.26"

  const weddingResult = await sql`
    INSERT INTO weddings (access_code, slug, couple_names, wedding_date)
    VALUES (${accessCode}, ${slug}, ${coupleNames}, ${weddingDate})
    ON CONFLICT (slug) DO UPDATE SET slug = ${slug}
    RETURNING id
  `
  const weddingId = weddingResult[0]?.id as string
  if (!weddingId) {
    throw new Error("Falha ao inserir casamento")
  }
  console.log(`   ✅ Casamento criado: ${coupleNames} (ID: ${weddingId})`)
  console.log(`   🔑 Access Code: ${accessCode}`)
  console.log(`   🔗 URL: /${accessCode}/${slug}\n`)

  // ── 5. Adicionar coluna wedding_id em photos ────────────────────────────────
  console.log("5/8 Adicionando coluna wedding_id nas tabelas...")
  await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE`
  await sql`ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE`
  // admin_config precisa de tratamento especial (PK mudou)
  console.log("   ✅ Colunas adicionadas\n")

  // ── 6. Migrar dados existentes ──────────────────────────────────────────────
   console.log("6/8 Migrando dados existentes...")
   const photoResult = await sql`UPDATE photos SET wedding_id = ${weddingId} WHERE wedding_id IS NULL`
   console.log(`   ✅ ${photoResult.rowCount ?? 0} fotos migradas`)

   const timelineResult = await sql`UPDATE timeline_events SET wedding_id = ${weddingId} WHERE wedding_id IS NULL`
   console.log(`   ✅ ${timelineResult.rowCount ?? 0} eventos de timeline migrados\n`)

  // ── 7. Migrar admin_config ──────────────────────────────────────────────────
  console.log("7/8 Migrando admin_config...")

  // Recria a tabela admin_config com a nova PK composta
  await sql`DROP TABLE IF EXISTS admin_config`
  await sql`
    CREATE TABLE admin_config (
      wedding_id     UUID        REFERENCES weddings(id) ON DELETE CASCADE,
      key            TEXT        NOT NULL,
      value          TEXT        NOT NULL,
      PRIMARY KEY (wedding_id, key)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_admin_config_wedding ON admin_config (wedding_id)`

  // Insere configs existentes para o casamento
  const defaultAdminPassword = await hash("admin123", SALT_ROUNDS)
  const defaultModPassword = await hash(process.env.DELETE_PASSWORD || "jamelao", SALT_ROUNDS)
  const defaultConfigs = [
    { key: "admin_password", value: defaultAdminPassword },
    { key: "moderation_password", value: defaultModPassword },
    { key: "max_storage_gb", value: "50" },
    { key: "couple_names", value: coupleNames },
    { key: "wedding_date", value: weddingDate },
    { key: "whatsapp_number", value: process.env.WHATSAPP_NUMBER || "5531988280047" },
    { key: "gallery_created_at", value: new Date().toISOString() },
  ]

  for (const cfg of defaultConfigs) {
    await sql`
      INSERT INTO admin_config (wedding_id, key, value)
      VALUES (${weddingId}, ${cfg.key}, ${cfg.value})
      ON CONFLICT (wedding_id, key) DO NOTHING
    `
  }

  console.log(`   ✅ ${defaultConfigs.length} configs migradas\n`)

  // ── 8. Tornar wedding_id NOT NULL nas tabelas ───────────────────────────────
  console.log("8/8 Finalizando schema...")
  await sql`ALTER TABLE photos ALTER COLUMN wedding_id SET NOT NULL`
  await sql`ALTER TABLE timeline_events ALTER COLUMN wedding_id SET NOT NULL`
  await sql`CREATE INDEX IF NOT EXISTS idx_photos_wedding ON photos (wedding_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_timeline_wedding ON timeline_events (wedding_id)`
  console.log("   ✅ Schema finalizado\n")

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("✅ Migração multi-tenant concluída com sucesso!")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`\n📍 Casamento: ${coupleNames}`)
  console.log(`🔑 Access Code: ${accessCode}`)
  console.log(`🔗 URL completa: /${accessCode}/${slug}`)
  console.log(`\n👤 Super Admin: ${adminEmail}`)
  console.log(`🔑 Senha: ${adminPassword}`)
  console.log(`\n⚠️  Altere a senha do super-admin após o primeiro login!`)
}

migrate().catch((error) => {
  console.error("❌ Erro na migração:", error)
  process.exit(1)
})
