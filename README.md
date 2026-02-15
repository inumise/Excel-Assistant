# Hyperplacity AI Workers (CEO Drawboard)

Luxury AI automation suite built on Next.js + React Flow + Supabase-compatible backend.

Palette: `#1A1A1A` / `#FFD700` / `#C9A483`

## What is included

- **CEO Drawboard UI** on `/` (and `/workers` alias)
  - Top-line command bar + 2D drag-and-drop board
  - Left role/tool/function library with icon cards
  - Right inspector for node mission, capabilities, role, and controls
  - Futuristic clean-white style with deep RGB pulse/wave motion
  - Corporate role templates + universal custom role builder
  - Build any org/tool/function structure with root/child/sibling/connect controls
  - Auto-arrange layout, collapse/expand branches, duplicate/delete subtrees
  - Monaco code blocks with:
    - AI Program
    - Self-Change
    - Delegate
    - Bugtrack & Fix
  - Typed edge colors (API blue, Code green, AI purple)
  - Live communication pulse animation on connected edges during workflow runs
  - Lightweight “Signal XP” game-style counters (subtle, non-intrusive)
  - Hierarchical node layout compatible with nested maps
- **AI Manager Settings** on `/settings`
  - OpenAI / Claude / Gemini key fields
  - Creativity slider (0.2–1.0)
  - Global prompt + tone preset
  - WhatsApp number + QR session setup
- **WhatsApp Webhook/API**
  - `/api/whatsapp` parses commands like:
    - `/cmd run workflow-web-design-factory`
    - `run workflow-web-design-factory`
  - `/api/whatsapp/qr` provisions QR/session metadata
  - Optional webhook secret + request rate limiting
- **Bugtracker**
  - `/bugtracker/[workflowId]` list and run auto-fix loop
  - `/api/bugtracker/cron` implements:
    - Fix bug -> Test -> if fail, escalate to Manager
- **Audit log**
  - `/api/audit` + server storage hooks
- **Memory Vault (simple AI database)**
  - `/api/memory` for storing/retrieving worker context by namespace/key
  - Right-side “Memory Vault” panel for quick write/read/delete
  - Runtime stores latest run + node summaries for reuse in prompts/tools

## Demo template

Seeded workflow: **Web Design Factory**

Flow:

`Manager AI -> Programmer AI -> Code Node -> Bugtracker -> WhatsApp confirmation`

## Supabase schema and RLS

Migration:

- `supabase/migrations/202602150001_hyperplacity_pro.sql`
- `supabase/migrations/202602150002_ai_memory.sql`

Includes:

- `users` (`whatsapp_number`, `ai_keys`, `global_prompt`, `creativity_temp`)
- `workflows`
- `nodes` (`type`, `code_snippet`, `tests_passed`)
- `bugtracks`
- `whatsapp_sessions` (`user_id`, `session_data`)
- `audit_log`
- `ai_memory` (lightweight key/value JSON store per workflow)

RLS policies ensure users only access their own keys/sessions/workflows.

## Quick start

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000/` (mind map workspace)
- `http://localhost:3000/workers`
- `http://localhost:3000/settings`
- `http://localhost:3000/bugtracker/workflow-web-design-factory`

## Useful scripts

```bash
npm run lint
npm run test:unit
npm run test:e2e
npm run bugtrack:check
```

## Environment variables

See `.env.example` for all options, including:

- Anthropic key for AI generation
- Supabase URL/service key
- AI key encryption secret
- Optional WPP Connect enable flag
- Optional WhatsApp webhook secret
- Optional SuperTokens client domains

## GitHub / VS Code workflow tie-in

- REST APIs are under `src/app/api/*` for direct inspection/debug in VS Code.
- Unit + E2E tests are provided in `/tests` for CI hooks on GitHub Actions.
- Bugtracker loop is callable manually (`/api/bugtracker/cron`) to integrate with PR/CI checks.
