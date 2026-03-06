import { NextResponse } from "next/server"
import { readdir, readFile } from "fs/promises"
import { homedir } from "os"
import path from "path"

interface AgentBudget {
  name: string
  emoji: string
  accent: string
  spentUsd: number
  budgetUsd: number
  tokens: number
}

interface BudgetsResponse {
  agents: AgentBudget[]
}

// Hardcoded monthly budgets
const AGENT_BUDGETS: AgentBudget[] = [
  { name: "Vic", emoji: "🦞", accent: "#7c3aed", spentUsd: 0, budgetUsd: 50, tokens: 0 },
  { name: "Scout", emoji: "🔭", accent: "#06b6d4", spentUsd: 0, budgetUsd: 30, tokens: 0 },
  { name: "Builder", emoji: "⚡", accent: "#10b981", spentUsd: 0, budgetUsd: 100, tokens: 0 },
  { name: "Deal Flow", emoji: "🤝", accent: "#f59e0b", spentUsd: 0, budgetUsd: 20, tokens: 0 },
  { name: "Baron", emoji: "🏦", accent: "#ec4899", spentUsd: 0, budgetUsd: 20, tokens: 0 },
]

// Map session labels to agent names
const AGENT_KEY_MAP: Record<string, string> = {
  main: "Vic",
  vic: "Vic",
  scout: "Scout",
  "deal-flow": "Deal Flow",
  dealflow: "Deal Flow",
  builder: "Builder",
  subagent: "Builder",
  wallet: "Baron",
  baron: "Baron",
}

// Pricing per million tokens
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-opus-4-5": { input: 15, output: 75 },
  "claude-haiku-3-5": { input: 0.8, output: 4 },
  "claude-opus-4": { input: 15, output: 75 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-haiku-3": { input: 0.25, output: 1.25 },
  "gpt-4o": { input: 5, output: 15 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
}

function getPricing(model: string): { input: number; output: number } {
  const lower = model.toLowerCase()
  for (const [key, price] of Object.entries(MODEL_PRICING)) {
    if (lower.includes(key.toLowerCase())) return price
  }
  return { input: 3, output: 15 }
}

function matchAgent(sessionLabel: string): string | null {
  const lower = sessionLabel.toLowerCase()
  for (const [key, agent] of Object.entries(AGENT_KEY_MAP)) {
    if (lower.includes(key)) return agent
  }
  return null
}

// Get start of current month timestamp
function getMonthStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export async function GET() {
  const agents = AGENT_BUDGETS.map((a) => ({ ...a }))
  const agentMap = new Map<string, AgentBudget>()
  for (const agent of agents) {
    agentMap.set(agent.name, agent)
  }

  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json({ agents } satisfies BudgetsResponse)
  }

  const logsDir = path.join(homedir(), ".openclaw", "logs")
  const monthStart = getMonthStart()

  try {
    const entries = await readdir(logsDir)
    const logFiles = entries.filter((f) => f.endsWith(".log") || f.endsWith(".jsonl") || f.endsWith(".json"))

    for (const file of logFiles) {
      const filePath = path.join(logsDir, file)
      let content: string
      try {
        content = await readFile(filePath, "utf-8")
      } catch {
        continue
      }

      const lines = content.split("\n").filter((l) => l.trim().startsWith("{"))

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as Record<string, unknown>

          // Filter to this month
          const ts = entry.timestamp as string | undefined
          if (ts) {
            const entryDate = new Date(ts)
            if (entryDate < monthStart) continue
          }

          const sessionLabel =
            (entry.session as string) ||
            (entry.sessionLabel as string) ||
            (entry.label as string) ||
            (entry.session_id as string) ||
            ""

          const agentName = matchAgent(sessionLabel)
          if (!agentName) continue

          const agent = agentMap.get(agentName)
          if (!agent) continue

          const rawModel =
            (entry.model as string) ||
            (entry.modelId as string) ||
            ""
          const model = rawModel.replace("anthropic/", "").replace("openai/", "")

          const usage = entry.usage as Record<string, number> | undefined
          const inputTokens =
            (entry.inputTokens as number) ||
            (entry.input_tokens as number) ||
            (usage?.input_tokens) ||
            (usage?.prompt_tokens) ||
            0
          const outputTokens =
            (entry.outputTokens as number) ||
            (entry.output_tokens as number) ||
            (usage?.output_tokens) ||
            (usage?.completion_tokens) ||
            0

          if (inputTokens === 0 && outputTokens === 0) continue

          const pricing = getPricing(model)
          const cost =
            (inputTokens / 1_000_000) * pricing.input +
            (outputTokens / 1_000_000) * pricing.output

          agent.spentUsd += cost
          agent.tokens += inputTokens + outputTokens
        } catch {
          // skip malformed lines
        }
      }
    }
  } catch {
    // logs dir unreadable — return zeros
  }

  // Round to 2 decimal places
  for (const agent of agents) {
    agent.spentUsd = Math.round(agent.spentUsd * 100) / 100
  }

  return NextResponse.json({ agents } satisfies BudgetsResponse)
}
