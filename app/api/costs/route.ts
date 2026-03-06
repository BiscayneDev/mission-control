import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { homedir } from "os"
import path from "path"

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-5": { input: 15, output: 75 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
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

interface ModelStats {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUSD: number
  sessions: number
}

interface SessionRecord {
  inputTokens?: number
  outputTokens?: number
  model?: string
  updatedAt?: number
}

export async function GET() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json({ totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, totalEstimatedCostUSD: 0, byModel: [], dataSource: "vercel-empty", lastUpdated: null })
  }

  const sessionsPath = path.join(homedir(), ".openclaw", "agents", "main", "sessions", "sessions.json")
  const modelMap = new Map<string, ModelStats>()
  let lastUpdated: string | null = null

  try {
    const raw = await readFile(sessionsPath, "utf-8")
    const sessions = JSON.parse(raw) as Record<string, SessionRecord>

    for (const session of Object.values(sessions)) {
      const inputTokens = session.inputTokens ?? 0
      const outputTokens = session.outputTokens ?? 0
      if (inputTokens === 0 && outputTokens === 0) continue

      const rawModel = session.model ?? "claude-sonnet-4-6"
      const model = rawModel.replace("anthropic/", "").replace("openai/", "")

      if (session.updatedAt) {
        const ts = new Date(session.updatedAt).toISOString()
        if (!lastUpdated || ts > lastUpdated) lastUpdated = ts
      }

      const existing = modelMap.get(model) ?? { model, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUSD: 0, sessions: 0 }
      const pricing = getPricing(model)
      const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output

      modelMap.set(model, {
        model,
        inputTokens: existing.inputTokens + inputTokens,
        outputTokens: existing.outputTokens + outputTokens,
        totalTokens: existing.totalTokens + inputTokens + outputTokens,
        estimatedCostUSD: existing.estimatedCostUSD + cost,
        sessions: existing.sessions + 1,
      })
    }
  } catch { /* unreadable — return empty */ }

  const byModel = Array.from(modelMap.values()).sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD)
  const totalInputTokens = byModel.reduce((s, m) => s + m.inputTokens, 0)
  const totalOutputTokens = byModel.reduce((s, m) => s + m.outputTokens, 0)
  const totalTokens = totalInputTokens + totalOutputTokens
  const totalEstimatedCostUSD = byModel.reduce((s, m) => s + m.estimatedCostUSD, 0)

  return NextResponse.json({ totalInputTokens, totalOutputTokens, totalTokens, totalEstimatedCostUSD, byModel, dataSource: "openclaw-sessions", lastUpdated })
}
