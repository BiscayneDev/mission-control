"use client"

import { useEffect, useState, useCallback } from "react"

const vic = {
  name: "Vic",
  emoji: "🦞",
  role: "Chief of Staff",
  accent: "#7c3aed",
  tags: ["Orchestration", "Memory", "Execution"],
  description: "Coordinates everything. Reads context, keeps memory sharp, makes sure nothing falls through the cracks.",
}

const agents = [
  {
    name: "Scout",
    emoji: "🔭",
    role: "Market Intelligence",
    accent: "#06b6d4",
    tags: ["x402", "Agent Land", "Crypto Intel"],
    description: "Monitors X, Reddit, and the web for signal across agent land, DeFi, and crypto.",
  },
  {
    name: "Deal Flow",
    emoji: "🤝",
    role: "Partnership Radar",
    accent: "#f59e0b",
    tags: ["MoonPay", "Ventures", "Outreach"],
    description: "Tracks funding rounds, partnerships, and strategic moves relevant to MoonPay.",
  },
  {
    name: "Builder",
    emoji: "⚡",
    role: "Full-Stack Dev",
    accent: "#10b981",
    tags: ["Next.js", "Solana", "Superteam"],
    description: "Ships code. Builds and maintains projects, automates workflows.",
  },
  {
    name: "Wallet",
    emoji: "💎",
    role: "Crypto Operations",
    accent: "#ec4899",
    tags: ["x402", "Solana", "MoonPay"],
    description: "On-chain ops — wallet monitoring, x402 payments, token research.",
  },
] as const

interface ActivityEvent {
  id: string
  timestamp: string
  agentEmoji: string
  agentName: string
  action: string
  detail: string
}

interface ActivityResponse {
  events: ActivityEvent[]
  lastUpdated: string | null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const PURPLE = "#7c3aed"

export default function AgentsPage() {
  const [activity, setActivity] = useState<ActivityResponse | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/activity", { cache: "no-store" })
      const data: ActivityResponse = await res.json()
      setActivity(data)
    } catch {
      // ignore
    } finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivity()
    const interval = setInterval(fetchActivity, 30_000)
    return () => clearInterval(interval)
  }, [fetchActivity])

  const displayEvents = activity?.events?.slice(0, 8) ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-4 h-full">
      {/* Mission Banner — compact */}
      <div
        className="rounded-lg px-5 py-3"
        style={{
          backgroundColor: "#111118",
          border: "1px solid rgba(124, 58, 237, 0.3)",
          boxShadow: "0 0 24px rgba(124, 58, 237, 0.1)",
        }}
      >
        <p className="text-sm italic font-light text-center leading-snug" style={{ color: "#c4b5fd" }}>
          &ldquo;Build an unfair advantage at the AI &times; crypto frontier — staying ahead of deals, protocols, and agent economies while automating everything that does not need me in it.&rdquo;
        </p>
      </div>

      {/* Vic — compact hero row */}
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: "#111118",
          border: "1px solid rgba(124, 58, 237, 0.35)",
          boxShadow: "0 0 30px rgba(124, 58, 237, 0.08)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center rounded-lg text-2xl shrink-0"
            style={{ width: "48px", height: "48px", backgroundColor: "rgba(124, 58, 237, 0.15)" }}
          >
            🦞
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-white">Vic</span>
              <span className="text-xs" style={{ color: "#7c3aed" }}>Chief of Staff · Orchestrator</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{vic.description}</p>
          </div>
          <div className="hidden sm:flex gap-1.5 shrink-0">
            {vic.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "rgba(124, 58, 237, 0.12)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124, 58, 237, 0.25)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Flow arrow */}
      <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-700">
        <span>INPUT</span>
        <span>→</span>
        <span style={{ color: "#a78bfa" }}>Vic</span>
        <span>→</span>
        <span>DELEGATES</span>
        <span>→</span>
        <span>AGENTS</span>
      </div>

      {/* Agent Grid — 2x2 compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="rounded-lg p-4"
            style={{
              backgroundColor: "#111118",
              border: `1px solid ${agent.accent}28`,
              boxShadow: `0 0 20px ${agent.accent}0a`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex items-center justify-center rounded-md text-xl shrink-0"
                style={{ width: "40px", height: "40px", backgroundColor: `${agent.accent}18` }}
              >
                {agent.emoji}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <span className="text-sm font-bold text-white">{agent.name}</span>
                  <span className="text-xs ml-2" style={{ color: agent.accent }}>{agent.role}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{agent.description}</p>
                <div className="flex flex-wrap gap-1">
                  {agent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: `${agent.accent}12`,
                        color: agent.accent,
                        border: `1px solid ${agent.accent}25`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "#111118",
          border: `1px solid ${PURPLE}28`,
          boxShadow: `0 0 20px ${PURPLE}08`,
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: `${PURPLE}20` }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: PURPLE, boxShadow: `0 0 6px ${PURPLE}` }}
            />
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Activity Feed
            </p>
          </div>
          {activity?.lastUpdated && (
            <p className="text-xs text-zinc-700">
              updated {timeAgo(activity.lastUpdated)}
            </p>
          )}
        </div>

        {activityLoading ? (
          <div className="px-5 py-6 text-center">
            <p className="text-xs text-zinc-600">Loading activity...</p>
          </div>
        ) : displayEvents.length === 0 ? (
          <div className="px-5 py-6 text-center space-y-1">
            <p className="text-xs text-zinc-500">No recent activity</p>
            <p className="text-xs text-zinc-700">Events appear as agents run</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/30">
            {displayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-base shrink-0 mt-0.5">{event.agentEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-300">{event.agentName}</span>
                    <span className="text-xs text-zinc-500">{event.action}</span>
                    {event.detail && (
                      <span className="text-xs text-zinc-700 truncate max-w-[200px]">
                        · {event.detail}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-700 mt-0.5">{timeAgo(event.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
