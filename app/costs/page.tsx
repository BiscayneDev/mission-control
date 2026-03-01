"use client"

import { useEffect, useState } from "react"

interface ModelStats {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUSD: number
  sessions: number
}

interface CostsData {
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalEstimatedCostUSD: number
  byModel: ModelStats[]
  dataSource: string
  lastUpdated: string | null
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtCost(n: number): string {
  if (n < 0.01) return "<$0.01"
  return `$${n.toFixed(2)}`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const AMBER = "#f59e0b"

export default function CostsPage() {
  const [data, setData] = useState<CostsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/costs")
      .then((r) => r.json())
      .then((d: CostsData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isEmpty =
    !data ||
    (data.totalTokens === 0 && data.byModel.length === 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h1 className="text-3xl font-bold text-white">Costs</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Token usage &amp; estimated spend across all models
            {data?.lastUpdated && (
              <span className="ml-2 text-zinc-600">· {timeAgo(data.lastUpdated)}</span>
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-zinc-600">Loading usage data...</p>
        </div>
      ) : isEmpty ? (
        <div
          className="rounded-xl p-10 text-center space-y-3"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          <p className="text-3xl">📊</p>
          <p className="text-zinc-400 font-medium">No data yet</p>
          <p className="text-xs text-zinc-600">
            Token usage data will appear here once OpenClaw logs usage events in{" "}
            <code className="text-zinc-500">~/.openclaw/logs/</code>
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Total Tokens",
                value: fmtTokens(data!.totalTokens),
                sub: "all time",
              },
              {
                label: "Input Tokens",
                value: fmtTokens(data!.totalInputTokens),
                sub: "prompt",
              },
              {
                label: "Output Tokens",
                value: fmtTokens(data!.totalOutputTokens),
                sub: "completion",
              },
              {
                label: "Est. Cost",
                value: fmtCost(data!.totalEstimatedCostUSD),
                sub: "USD",
                highlight: true,
              },
            ].map(({ label, value, sub, highlight }) => (
              <div
                key={label}
                className="rounded-xl p-4 space-y-1"
                style={{
                  backgroundColor: "#111118",
                  border: highlight
                    ? `1px solid ${AMBER}40`
                    : "1px solid #1a1a2e",
                  boxShadow: highlight
                    ? `0 0 20px ${AMBER}10`
                    : undefined,
                }}
              >
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: highlight ? AMBER : "white" }}
                >
                  {value}
                </p>
                <p className="text-xs text-zinc-700">{sub}</p>
              </div>
            ))}
          </div>

          {/* Per-model breakdown */}
          {data!.byModel.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
            >
              <div className="px-5 py-3 border-b border-zinc-800/50">
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Breakdown by model
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/50">
                      <th className="text-left px-5 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Model
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Input
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Output
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Sessions
                      </th>
                      <th className="text-right px-5 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Est. Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.byModel.map((m) => (
                      <tr
                        key={m.model}
                        className="border-b border-zinc-800/30 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-zinc-300">
                          {m.model}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-400">
                          {fmtTokens(m.inputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-400">
                          {fmtTokens(m.outputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-500">
                          {m.sessions}
                        </td>
                        <td
                          className="px-5 py-3 text-right text-xs font-semibold"
                          style={{ color: AMBER }}
                        >
                          {fmtCost(m.estimatedCostUSD)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-700/50">
                      <td className="px-5 py-3 text-xs font-semibold text-zinc-300">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-zinc-300">
                        {fmtTokens(data!.totalInputTokens)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-zinc-300">
                        {fmtTokens(data!.totalOutputTokens)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-500">
                        —
                      </td>
                      <td
                        className="px-5 py-3 text-right text-sm font-bold"
                        style={{ color: AMBER }}
                      >
                        {fmtCost(data!.totalEstimatedCostUSD)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-5 py-2 border-t border-zinc-800/50">
                <p className="text-xs text-zinc-700">
                  Costs are estimates based on public pricing. Actual charges may differ.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
