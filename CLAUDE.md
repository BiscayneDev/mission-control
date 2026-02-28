# Mission Control — CLAUDE.md

## What This Is
Halsey Huth's personal AI mission control dashboard. A Next.js web app that surfaces agent status, tasks, projects, intel, and skills in one place.

## Stack
- **Framework:** Next.js 16 (App Router), TypeScript strict
- **Styling:** Tailwind CSS
- **Design system:** Dark theme — bg #0a0a0f, cards #111118, glow borders per accent color
- **Deploy:** Vercel (auto-deploy from BiscayneDev/mission-control main branch)
- **URL:** https://mission-control-two-ebon.vercel.app

## Key Commands
```bash
npm run dev          # Dev server → localhost:3000 (or 3001 if taken)
npm run build        # Production build (always run before push)
vercel --prod        # Deploy to production
git add -A && git commit -m "feat: ..."
```

## Project Structure
```
app/
  agents/        # Team page — Vic + 4 agents
  tasks/         # Kanban board (Backlog/In Progress/In Review/Done)
  projects/      # GitHub repos (BiscayneDev)
  intel/         # Scout's market intelligence feed
  skills/        # OpenClaw skills list
  memory/        # Stub
  calendar/      # Stub
  docs/          # Stub
  settings/      # Stub
  api/
    tasks/       # CRUD — reads/writes data/tasks.json locally
    projects/    # GitHub REST API (GITHUB_TOKEN env var)
    skills/      # openclaw skills list --json (local only)
    intel/
      report/    # Reads ~/clawd/agents/scout/reports/latest.json
      deploy/    # Spawns Scout research script in background
components/
  Sidebar.tsx    # Desktop sidebar + mobile bottom nav (5 items)
lib/
  tasks.ts       # Task types + constants
data/
  tasks.json     # Local task store (not persisted on Vercel)
```

## Architecture Notes
- **API routes with CLIs** must use full binary paths: `/opt/homebrew/bin/openclaw`, `/opt/homebrew/bin/gh` — Next.js doesn't inherit shell PATH
- **Vercel detection:** `process.env.VERCEL` — skills page and deploy route gracefully degrade on Vercel
- **Tasks persistence:** Currently local JSON (not persisted on Vercel). If adding DB: use Vercel KV
- **Mobile:** Bottom nav bar (5 items), sidebar hidden on mobile (`md:hidden`)
- **Kanban:** Uses `@hello-pangea/dnd` for drag-and-drop

## Agents in the App
| Agent | Emoji | Color |
|-------|-------|-------|
| Vic | 🦞 | #7c3aed (purple) |
| Scout | 🔭 | #06b6d4 (cyan) |
| Deal Flow | 🤝 | #f59e0b (amber) |
| Builder | ⚡ | #10b981 (emerald) |
| Wallet | 💎 | #ec4899 (pink) |

## Env Vars (Vercel)
- `GITHUB_TOKEN` — GitHub PAT for private repo access in Projects page

## DO NOT
- Break the dark theme (bg #0a0a0f)
- Add pagination/routing complexity — keep pages self-contained
- Use `any` in TypeScript
- Push without running `npm run build` first
- Work in ~/clawd — that's Vic's workspace
