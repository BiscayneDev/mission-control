import { NextResponse } from "next/server"
import { readdir, readFile } from "fs/promises"
import { homedir } from "os"
import path from "path"

interface ActivityEvent {
  id: string
  timestamp: string
  agentEmoji: string
  agentName: string
  action: string
  detail: string
}

const ACTION_EMOJI_MAP: Record<string, { emoji: string; name: string }> = {
  "agent:main:main": { emoji: "🦞", name: "Vic" },
  "agent:main:subagent": { emoji: "⚡", name: "Subagent" },
  "builder": { emoji: "⚡", name: "Builder" },
  "scout": { emoji: "🔭", name: "Scout" },
  "wallet": { emoji: "💎", name: "Wallet" },
  "deal": { emoji: "🤝", name: "Deal Flow" },
}

function resolveAgent(sessionKey: string): { emoji: string; name: string } {
  const lower = (sessionKey ?? "").toLowerCase()
  for (const [key, val] of Object.entries(ACTION_EMOJI_MAP)) {
    if (lower.includes(key)) return val
  }
  return { emoji: "🤖", name: "Agent" }
}

function describeAction(entry: Record<string, unknown>): string {
  const action = (entry.action as string) ?? (entry.event as string) ?? "activity"
  const map: Record<string, string> = {
    new: "started a new session",
    end: "ended session",
    message: "processed a message",
    tool_call: "used a tool",
    response: "sent a response",
    error: "encountered an error",
  }
  return map[action] ?? action
}

export async function GET() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json({ events: [], lastUpdated: null })
  }

  const logsDir = path.join(homedir(), ".openclaw", "logs")
  const events: ActivityEvent[] = []

  try {
    const entries = await readdir(logsDir)
    const logFiles = entries.filter((f) => f.endsWith(".log") || f.endsWith(".jsonl"))

    for (const file of logFiles) {
      const filePath = path.join(logsDir, file)
      let content: string
      try {
        content = await readFile(filePath, "utf-8")
      } catch {
        continue
      }

      const lines = content
        .split("\n")
        .filter((l) => l.trim().startsWith("{"))
        .slice(-50) // only last 50 lines per file

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as Record<string, unknown>
          if (!entry.timestamp) continue

          const sessionKey = (entry.sessionKey as string) ?? (entry.session as string) ?? ""
          const agent = resolveAgent(sessionKey)
          const action = describeAction(entry)

          events.push({
            id: `${entry.timestamp}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: entry.timestamp as string,
            agentEmoji: agent.emoji,
            agentName: agent.name,
            action,
            detail: sessionKey || (entry.source as string) || "",
          })
        } catch {
          // skip
        }
      }
    }
  } catch {
    // logs dir unreadable
  }

  // Sort newest first, return max 20
  events.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
  const top = events.slice(0, 20)

  return NextResponse.json({
    events: top,
    lastUpdated: new Date().toISOString(),
  })
}
