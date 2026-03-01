import { NextResponse } from "next/server"
import { readdir, readFile } from "fs/promises"
import { homedir } from "os"
import path from "path"

// Pricing per million tokens (input / output) in USD
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
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-4": { input: 30, output: 60 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "o1": { input: 15, output: 60 },
  "o1-mini": { input: 3, output: 12 },
  "o3-mini": { input: 1.1, output: 4.4 },
  "gemini-1.5-pro": { input: 1.25, output: 5 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
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

interface CostsResponse {
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalEstimatedCostUSD: number
  byModel: ModelStats[]
  dataSource: string
  lastUpdated: string | null
}

export async function GET() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    const empty: CostsResponse = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalEstimatedCostUSD: 0,
      byModel: [],
      dataSource: "vercel-empty",
      lastUpdated: null,
    }
    return NextResponse.json(empty)
  }

  const logsDir = path.join(homedir(), ".openclaw", "logs")
  const modelMap = new Map<string, ModelStats>()
  let lastUpdated: string | null = null

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

          const rawModel =
            (entry.model as string) ||
            (entry.modelId as string) ||
            (entry.agent_model as string) ||
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

          if (!model || (inputTokens === 0 && outputTokens === 0)) continue

          if (entry.timestamp && typeof entry.timestamp === "string") {
            if (!lastUpdated || (entry.timestamp as string) > lastUpdated) {
              lastUpdated = entry.timestamp as string
            }
          }

          const existing = modelMap.get(model) ?? {
            model,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            estimatedCostUSD: 0,
            sessions: 0,
          }

          const pricing = getPricing(model)
          const cost =
            (inputTokens / 1_000_000) * pricing.input +
            (outputTokens / 1_000_000) * pricing.output

          modelMap.set(model, {
            model,
            inputTokens: existing.inputTokens + inputTokens,
            outputTokens: existing.outputTokens + outputTokens,
            totalTokens: existing.totalTokens + inputTokens + outputTokens,
            estimatedCostUSD: existing.estimatedCostUSD + cost,
            sessions: existing.sessions + 1,
          })
        } catch {
          // skip malformed lines
        }
      }
    }
  } catch {
    // logs dir unreadable — return empty
  }

  const byModel = Array.from(modelMap.values()).sort(
    (a, b) => b.estimatedCostUSD - a.estimatedCostUSD
  )

  const totalInputTokens = byModel.reduce((s, m) => s + m.inputTokens, 0)
  const totalOutputTokens = byModel.reduce((s, m) => s + m.outputTokens, 0)
  const totalTokens = totalInputTokens + totalOutputTokens
  const totalEstimatedCostUSD = byModel.reduce((s, m) => s + m.estimatedCostUSD, 0)

  const response: CostsResponse = {
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    totalEstimatedCostUSD,
    byModel,
    dataSource: "openclaw-logs",
    lastUpdated,
  }

  return NextResponse.json(response)
}
