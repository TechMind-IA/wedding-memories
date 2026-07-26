# AGENTS.md

## Quick Commands

```bash
pnpm dev          # Dev server with Turbopack
pnpm build        # Production build
pnpm lint         # ESLint via next lint
```

No `typecheck` or `test` scripts exist. Run `npx tsc --noEmit` for type checking.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Neon PostgreSQL** (serverless, via `@neondatabase/serverless`)
- **AWS S3** for photo/video storage (presigned URL uploads)
- **shadcn/ui** (default style, neutral base, lucide icons) + Tailwind CSS

## Architecture

Multi-tenant wedding gallery SaaS. Each wedding has a private URL: `/{12-char-hex-accessCode}/{slug}`.

Key boundaries:
- `app/[accessCode]/[slug]/` — per-wedding guest-facing routes and admin panel
- `app/api/[accessCode]/[slug]/` — per-wedding API routes (photos, upload, reactions, admin)
- `app/super-admin/` + `app/api/super-admin/` — super-admin panel for managing all weddings
- `lib/db.ts` — all database queries (~700 lines, single file)
- `lib/s3.ts` — AWS S3 operations
- `lib/wedding-context.ts` — wedding resolution with in-memory cache
- `components/` — guest flow components (welcome, upload, gallery) + 40+ shadcn/ui components in `components/ui/`

## Database

7 tables in `schema.sql`. Run `npx tsx scripts/migrate-multitenancy.ts` to initialize (requires `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` env vars). The `lib/db.ts` file also has an `initializeDatabase()` function that can create tables programmatically.

## Theming

Each wedding gets a dynamic color palette generated from a single hex color via `lib/color-utils.ts` (WCAG contrast-aware). The `WeddingTheme` component injects CSS variables at runtime. Fonts: montserrat (default), playfair, poppins, lora. Backgrounds: floral, minimalist, botanical, rustic.

## Environment Variables

Required (no `.env.example` exists):
- `DATABASE_URL` — Neon PostgreSQL connection string
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME` — S3 storage
- `DELETE_PASSWORD` — photo deletion gate (default: "jamelao")

## WhatsApp Sales Agent

The project includes a WhatsApp MCP integration (`Agent/`) that enables an AI sales agent named **Lia** to converse with potential clients.

**Documentation:** `SALES-AGENT.md` — full personality, conversation flow, objection handling, and MCP tool usage.

**Skill:** `.opencode/skills/wedding-sales/SKILL.md` — loadable skill for opencode sessions.

**MCP Tools available:**
- `list_messages` — read conversation history with a client
- `get_direct_chat_by_contact` — find chat by phone number
- `get_last_interaction` — see last message exchanged
- `send_message` — send text message
- `send_file` — send image/video/document

**Prerequisites:** The WhatsApp bridge (`Agent/whatsapp-mcp-main/whatsapp-bridge/`) must be running. See `Agent/whatsapp-mcp-main/README.md` for setup.

**Auto-Reply:** The bridge supports automatic responses for whitelisted numbers. See `Agent/whatsapp-mcp-main/auto-reply-config.json` for configuration. Requires `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` environment variable.

## Gotchas

- `pnpm` is the real package manager despite `clean` script using `npm install`
- No CI/CD workflows configured
- The `Agent/` directory is a third-party WhatsApp MCP tool (Go + Python), not custom project code
- Admin passwords auto-migrate from plaintext to bcrypt on login
- Photo uploads go directly to S3 via presigned URLs (not through the server)
- `proxy.ts` is the Next.js middleware — validates access codes and slugs, sets session cookies
