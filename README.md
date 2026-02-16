# Owner AI Employee Builder

Luxury AI automation suite built on Next.js + React Flow + Supabase-compatible backend.

Palette: `#1A1A1A` / `#FFD700` / `#C9A483`

## What is included

- **Owner Builder UI** on `/` (and `/workers`, `/structures` aliases)
  - Owner-first top command bar + empty schematic map board
  - Left AI worker list for click/hold + drag-to-map on mobile/PC
  - Right owner control window with Prompt / Code / Todo / Output modes
  - Futuristic clean-white style with deep RGB pulse/wave motion
  - Corporate role templates + universal custom role builder
  - Build any org/tool/function structure with drag-to-create blocks
  - Black input dot + red output dot connectors between blocks
  - Auto-arrange layout, collapse/expand branches, duplicate/delete subtrees
  - Monaco code blocks with:
    - AI Program
    - Self-Change
    - Delegate
    - Bugtrack & Fix
  - Typed edge colors (API blue, Code green, AI purple)
  - Live communication pulse animation on connected edges during workflow runs
  - Lightweight “Signal XP” game-style counters (subtle, non-intrusive)
  - Signal Storm simulator + pulse replay controls
  - Workflow Validate + Auto-Repair controls
  - Reliability Matrix panel for runtime health checks
  - Hierarchical node layout compatible with nested maps
- **Owner Suite Pages**
  - `/overview` executive dashboard (structure scale + readiness)
  - `/templates` one-click structure blueprints for large organizations
  - `/playbooks` reusable prompt playbook library
  - `/operations` reliability + validation + operations events
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
- **Workflow Validation + Self-Healing**
  - `/api/workflows/[workflowId]/validate` to inspect/fix broken graph state
  - Save and run endpoints perform safety validation and can auto-repair
- **System Health Diagnostics**
  - `/api/system/health` returns runtime readiness checks (providers, storage, security)
- **Template API**
  - `/api/templates` list/create owner-scale structure templates

## Default starting structure

Seeded workflow: **Owner Employee Structure** (empty schematic map)

Flow:

Drag worker from left list -> drop on map -> connect black/red dots -> edit prompts/code -> run

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
- `http://localhost:3000/overview`
- `http://localhost:3000/templates`
- `http://localhost:3000/playbooks`
- `http://localhost:3000/operations`
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

## Upgrade/innovation tracker

- `UPGRADE_MASTER_PLAN.md` contains the executed upgrade list, todo list, invention list, and technical improvements.
