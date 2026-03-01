"use client"

import { useEffect, useState, useCallback } from "react"

interface ReportItem {
  title: string
  detail: string
  source: string
  signal: "high" | "medium" | "low"
}

interface ReportSection {
  topic: string
  headline: string
  items: ReportItem[]
}

interface TopPost {
  platform: "x" | "reddit"
  handle: string
  text: string
  engagement: string
}

interface ScoutReport {
  generatedAt: string | null
  period: string
  topics: string[]
  summary: string
  sections: ReportSection[]
  topPosts: TopPost[]
  stats: { xPosts: number; redditThreads: number; webPages: number }
  rawOutput?: string
}

interface StandupData {
  date: string
  entries: string[]
  filesRead: string[]
}

const SIGNAL_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#06b6d4",
}

const TOPIC_COLORS: Record<string, string> = {
  x402: "#06b6d4",
  OpenClaw: "#7c3aed",
  "MoonPay Agents": "#10b981",
  "crypto agent skills": "#f59e0b",
}

const EMERALD = "#10b981"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function StandupCard({ data }: { data: StandupData | null }) {
  const [open, setOpen] = useState(false)

  if (!data) return null

  const hasEntries = data.entries.length > 0
  const isSeparator = (e: string) => e.startsWith("---") && e.endsWith("---")

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "#111118",
        border: `1px solid ${EMERALD}28`,
        boxShadow: open ? `0 0 20px ${EMERALD}08` : undefined,
      }}
    >
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: EMERALD, boxShadow: `0 0 6px ${EMERALD}` }}
          />
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Daily Standup
          </span>
          <span className="text-xs text-zinc-600">· from memory logs</span>
          {data.filesRead.length > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full ml-1"
              style={{ backgroundColor: `${EMERALD}15`, color: EMERALD }}
            >
              {data.filesRead.length} file{data.filesRead.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span
          className="text-xs transition-transform duration-200"
          style={{
            color: EMERALD,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-1 border-t border-zinc-800/50 pt-3">
          {!hasEntries ? (
            <p className="text-xs text-zinc-600">
              No daily notes found for today or yesterday in{" "}
              <code className="text-zinc-500">~/clawd/memory/</code>
            </p>
          ) : (
            data.entries.map((entry, i) => (
              isSeparator(entry) ? (
                <p
                  key={i}
                  className="text-xs font-mono text-zinc-600 pt-2 pb-1"
                >
                  {entry.replace(/^--- /, "").replace(/ ---$/, "")}
                </p>
              ) : (
                <div key={i} className="flex items-start gap-2">
                  <span style={{ color: EMERALD }} className="text-xs shrink-0 mt-0.5">·</span>
                  <p className="text-xs text-zinc-400 leading-relaxed">{entry}</p>
                </div>
              )
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function IntelPage() {
  const [report, setReport] = useState<ScoutReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState(false)
  const [standup, setStandup] = useState<StandupData | null>(null)

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch("/api/intel/report", { cache: "no-store" })
      const data = await res.json()
      setReport(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
    // Fetch standup data
    fetch("/api/standup")
      .then((r) => r.json())
      .then((d: StandupData) => setStandup(d))
      .catch(() => {})
  }, [fetchReport])

  const hasReport = report?.generatedAt != null && (report?.sections?.length ?? 0) > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔭</span>
            <h1 className="text-3xl font-bold text-white">Intel</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Scout&apos;s market intelligence feed
            {report?.generatedAt && (
              <span className="ml-2 text-zinc-600">· {timeAgo(report.generatedAt)}</span>
            )}
          </p>
        </div>

        <button
          onClick={async () => {
            setDeploying(true)
            await fetch("/api/intel/deploy", { method: "POST" }).catch(() => {})
            // Poll every 15s for up to 3 minutes
            let attempts = 0
            const poll = setInterval(async () => {
              attempts++
              await fetchReport()
              if (attempts >= 12) { clearInterval(poll); setDeploying(false) }
            }, 15000)
          }}
          disabled={deploying}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: deploying ? "#1a1a2e" : "rgba(6,182,212,0.15)",
            color: deploying ? "#52525b" : "#06b6d4",
            border: "1px solid rgba(6,182,212,0.3)",
            cursor: deploying ? "not-allowed" : "pointer",
          }}
        >
          <span style={{ display: "inline-block", animation: deploying ? "spin 1s linear infinite" : "none" }}>🔭</span>
          {deploying ? "Scout deployed..." : "Deploy Scout"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-zinc-600">Loading last report...</p>
        </div>
      ) : !hasReport ? (
        <div
          className="rounded-xl p-10 text-center space-y-3"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          <p className="text-3xl">🔭</p>
          <p className="text-zinc-400 font-medium">Scout hasn&apos;t reported yet</p>
          <p className="text-xs text-zinc-600">
            Hit &quot;Deploy Scout&quot; or ask Vic &quot;what&apos;s the latest in agent land&quot;
          </p>
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: "#111118",
              border: "1px solid rgba(6,182,212,0.2)",
              boxShadow: "0 0 20px rgba(6,182,212,0.05)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-600">Executive Summary</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(6,182,212,0.1)", color: "#06b6d4" }}
              >
                {report?.period ?? "24h"}
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{report?.summary}</p>

            {/* Stats row */}
            {report?.stats && (
              <div className="flex gap-4 mt-4 pt-4 border-t border-zinc-800/50">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{report.stats.xPosts}</p>
                  <p className="text-xs text-zinc-600">X posts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{report.stats.redditThreads}</p>
                  <p className="text-xs text-zinc-600">Reddit threads</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{report.stats.webPages}</p>
                  <p className="text-xs text-zinc-600">Web pages</p>
                </div>
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {report?.sections?.map((section) => {
              const color = TOPIC_COLORS[section.topic] ?? "#a1a1aa"
              return (
                <div
                  key={section.topic}
                  className="rounded-xl p-5 space-y-4"
                  style={{
                    backgroundColor: "#111118",
                    border: `1px solid ${color}22`,
                    borderLeftWidth: "3px",
                    borderLeftColor: color,
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase tracking-wider" style={{ color }}>
                        {section.topic}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-1">{section.headline}</p>
                  </div>

                  <div className="space-y-3">
                    {section.items?.map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <span
                          className="text-xs mt-0.5 shrink-0 font-bold"
                          style={{ color: SIGNAL_COLORS[item.signal] ?? "#a1a1aa" }}
                        >
                          {item.signal === "high" ? "🔥" : item.signal === "medium" ? "→" : "·"}
                        </span>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-zinc-300">{item.title}</p>
                          <p className="text-xs text-zinc-500">{item.detail}</p>
                          <p className="text-xs text-zinc-700">per {item.source}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Raw output fallback when no structured sections */}
          {(!report?.sections || report.sections.length === 0) && report?.rawOutput && (
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
            >
              <p className="text-xs font-mono uppercase tracking-wider text-zinc-600 mb-3">Scout&apos;s raw output</p>
              <pre className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {report.rawOutput}
              </pre>
            </div>
          )}

          {/* Top posts */}
          {report?.topPosts && report.topPosts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-zinc-600">Top posts</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.topPosts.map((post, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3 space-y-1.5"
                    style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{post.platform === "x" ? "𝕏" : "🟠"}</span>
                      <span className="text-xs font-medium text-zinc-400">{post.handle}</span>
                      {post.engagement && (
                        <span className="text-xs text-zinc-700 ml-auto">{post.engagement}</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">{post.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Standup Report — always shown below Scout section */}
      <StandupCard data={standup} />
    </div>
  )
}
