import { NextResponse } from "next/server"

// ── Types ──────────────────────────────────────────────────────────────────

interface UsageResult {
  model: string
  uncached_input_tokens: number
  cache_creation?: { ephemeral_1h_input_tokens?: number; ephemeral_5m_input_tokens?: number }
  cache_read_input_tokens: number
  output_tokens: number
}

interface UsageBucket {
  starting_at: string
  ending_at: string
  results: UsageResult[]
}

interface UsageResponse {
  data: UsageBucket[]
  has_more: boolean
  next_page?: string | null
}

interface CostResult {
  currency: string
  amount: string
  cost_type?: string
}

interface CostBucket {
  starting_at: string
  ending_at: string
  results: CostResult[]
}

interface CostResponse {
  data: CostBucket[]
  has_more: boolean
  next_page?: string | null
}

interface ModelSummary {
  model: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
}

interface DailyCost {
  date: string
  costUSD: number
}

interface CostsResult {
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheCreationTokens: number
  totalCacheReadTokens: number
  totalTokens: number
  totalCostUSD: number
  byModel: ModelSummary[]
  dailyCosts: DailyCost[]
  dataSource: string
  lastUpdated: string | null
  error?: string
}

// ── Cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000
let cachedResult: CostsResult | null = null
let cachedAt = 0

function emptyResponse(error: string): CostsResult {
  return { error, totalCostUSD: 0, byModel: [], dailyCosts: [], totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCacheCreationTokens: 0, totalCacheReadTokens: 0, dataSource: "none", lastUpdated: null }
}

function dateRange() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return { starting_at: thirtyDaysAgo.toISOString(), ending_at: now.toISOString() }
}

function apiHeaders(): Record<string, string> {
  return { "anthropic-version": "2023-06-01", "x-api-key": process.env.ANTHROPIC_ADMIN_KEY! }
}

async function fetchAllUsage(): Promise<UsageBucket[]> {
  const { starting_at, ending_at } = dateRange()
  const all: UsageBucket[] = []
  let pageToken: string | null = null

  do {
    const params = new URLSearchParams({ starting_at, ending_at, bucket_width: "1d", "group_by[]": "model" })
    if (pageToken) params.set("page", pageToken)
    const res = await fetch(`https://api.anthropic.com/v1/organizations/usage_report/messages?${params}`, { headers: apiHeaders() })
    if (!res.ok) throw new Error(`Usage API ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as UsageResponse
    all.push(...data.data)
    pageToken = data.has_more && data.next_page ? data.next_page : null
  } while (pageToken)

  return all
}

async function fetchAllCosts(): Promise<CostBucket[]> {
  const { starting_at, ending_at } = dateRange()
  const all: CostBucket[] = []
  let pageToken: string | null = null

  do {
    const params = new URLSearchParams({ starting_at, ending_at, bucket_width: "1d", "group_by[]": "description" })
    if (pageToken) params.set("page", pageToken)
    const res = await fetch(`https://api.anthropic.com/v1/organizations/cost_report?${params}`, { headers: apiHeaders() })
    if (!res.ok) throw new Error(`Cost API ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as CostResponse
    all.push(...data.data)
    pageToken = data.has_more && data.next_page ? data.next_page : null
  } while (pageToken)

  return all
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET() {
  if (!process.env.ANTHROPIC_ADMIN_KEY) {
    return NextResponse.json(emptyResponse("no_admin_key"))
  }

  if (cachedResult && Date.now() - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedResult)
  }

  try {
    const [usageBuckets, costBuckets] = await Promise.all([fetchAllUsage(), fetchAllCosts()])

    // Aggregate usage by model — real field names from the API
    const modelMap = new Map<string, ModelSummary>()
    for (const bucket of usageBuckets) {
      for (const r of bucket.results) {
        const e = modelMap.get(r.model) ?? { model: r.model, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, totalTokens: 0 }
        const inp = r.uncached_input_tokens ?? 0
        const out = r.output_tokens ?? 0
        const cr = r.cache_read_input_tokens ?? 0
        const cc = (r.cache_creation?.ephemeral_1h_input_tokens ?? 0) + (r.cache_creation?.ephemeral_5m_input_tokens ?? 0)
        modelMap.set(r.model, {
          model: r.model,
          inputTokens: e.inputTokens + inp,
          outputTokens: e.outputTokens + out,
          cacheCreationTokens: e.cacheCreationTokens + cc,
          cacheReadTokens: e.cacheReadTokens + cr,
          totalTokens: e.totalTokens + inp + out + cc + cr,
        })
      }
    }
    const byModel = Array.from(modelMap.values()).sort((a, b) => b.totalTokens - a.totalTokens)

    // Aggregate daily costs
    const dailyMap = new Map<string, number>()
    for (const bucket of costBuckets) {
      const date = bucket.starting_at.slice(0, 10)
      const dayTotal = bucket.results
        .filter(r => !r.cost_type || r.cost_type === "tokens")
        .reduce((s, r) => s + parseFloat(r.amount), 0)
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + dayTotal)
    }
    const dailyCosts: DailyCost[] = Array.from(dailyMap.entries())
      .map(([date, costUSD]) => ({ date, costUSD }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const totalInputTokens = byModel.reduce((s, m) => s + m.inputTokens, 0)
    const totalOutputTokens = byModel.reduce((s, m) => s + m.outputTokens, 0)
    const totalCacheCreationTokens = byModel.reduce((s, m) => s + m.cacheCreationTokens, 0)
    const totalCacheReadTokens = byModel.reduce((s, m) => s + m.cacheReadTokens, 0)
    const totalTokens = totalInputTokens + totalOutputTokens + totalCacheCreationTokens + totalCacheReadTokens
    const totalCostUSD = dailyCosts.reduce((s, d) => s + d.costUSD, 0)

    const result: CostsResult = { totalInputTokens, totalOutputTokens, totalCacheCreationTokens, totalCacheReadTokens, totalTokens, totalCostUSD, byModel, dailyCosts, dataSource: "anthropic-admin-api", lastUpdated: new Date().toISOString() }

    cachedResult = result
    cachedAt = Date.now()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ...emptyResponse("api_error"), error: msg }, { status: 500 })
  }
}
