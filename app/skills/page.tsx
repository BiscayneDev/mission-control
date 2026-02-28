"use client"

import { useEffect, useState, useCallback } from "react"

interface Skill {
  name: string
  description?: string
  status: string
  source?: string
  emoji?: string
}

type FilterTab = "all" | "ready" | "missing" | "disabled"

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; border: string }> = {
  ready: { label: "Ready", icon: "✓", color: "#22c55e", border: "#22c55e" },
  missing: { label: "Missing", icon: "✗", color: "#ef4444", border: "#ef4444" },
  disabled: { label: "Disabled", icon: "⏸", color: "#71717a", border: "#71717a" },
}

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  bundled: { label: "bundled", color: "#3178c6" },
  workspace: { label: "workspace", color: "#7c3aed" },
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [remoteMode, setRemoteMode] = useState(false)

  const fetchSkills = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(false)
    try {
      const res = await fetch("/api/skills", { cache: "no-store" })
      if (res.status === 503) { setRemoteMode(true); return }
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setSkills(data)
        setLastUpdated(new Date())
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  // Refresh on window focus (catches installs done in terminal)
  useEffect(() => {
    const onFocus = () => fetchSkills(true)
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [fetchSkills])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchSkills(true), 60_000)
    return () => clearInterval(interval)
  }, [fetchSkills])

  const filteredSkills =
    filter === "all"
      ? skills
      : skills.filter((s) => s.status === filter)

  const counts = {
    ready: skills.filter((s) => s.status === "ready").length,
    missing: skills.filter((s) => s.status === "missing").length,
    disabled: skills.filter((s) => s.status === "disabled").length,
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "ready", label: "Ready" },
    { id: "missing", label: "Missing" },
    { id: "disabled", label: "Disabled" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Loading skills...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">Skills</h1>
          <p className="text-sm text-zinc-500">
            Installed &amp; active OpenClaw capabilities
            {lastUpdated && (
              <span className="ml-2 text-zinc-600">
                · updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchSkills(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: "#1a1a2e",
            color: refreshing ? "#52525b" : "#a1a1aa",
            cursor: refreshing ? "not-allowed" : "pointer",
          }}
        >
          <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none" }}>↻</span>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {remoteMode ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}>
          <p className="text-2xl mb-2">🦞</p>
          <p className="text-sm text-zinc-400 font-medium">Skills are only available locally</p>
          <p className="text-xs text-zinc-600 mt-1">Open this on your Mac to see your installed skills.</p>
        </div>
      ) : error ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: "#111118",
            border: "1px solid #1a1a2e",
          }}
        >
          <p className="text-zinc-500 text-sm">
            Could not load skills. Make sure the{" "}
            <code className="text-zinc-400">openclaw</code> CLI is installed
            and configured.
          </p>
        </div>
      ) : (
        <>
          {/* Summary + Tabs */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              <span style={{ color: "#22c55e" }}>{counts.ready} ready</span>
              {" · "}
              <span style={{ color: "#ef4444" }}>{counts.missing} missing</span>
              {" · "}
              <span style={{ color: "#71717a" }}>{counts.disabled} disabled</span>
            </p>

            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor:
                      filter === tab.id ? "#1a1a2e" : "transparent",
                    color: filter === tab.id ? "#e4e4e7" : "#71717a",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => {
              const statusCfg =
                STATUS_CONFIG[skill.status] || STATUS_CONFIG.disabled
              const sourceCfg = skill.source
                ? SOURCE_CONFIG[skill.source] || {
                    label: skill.source,
                    color: "#71717a",
                  }
                : null

              return (
                <div
                  key={skill.name}
                  className="rounded-xl p-5 space-y-3"
                  style={{
                    backgroundColor: "#111118",
                    border: "1px solid #1a1a2e",
                    borderLeftWidth: "3px",
                    borderLeftColor: statusCfg.border,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {skill.emoji && (
                        <span className="text-lg">{skill.emoji}</span>
                      )}
                      <h3 className="text-sm font-bold text-white">
                        {skill.name}
                      </h3>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${statusCfg.color}20`,
                        color: statusCfg.color,
                      }}
                    >
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  </div>

                  {skill.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2">
                      {skill.description}
                    </p>
                  )}

                  {sourceCfg && (
                    <span
                      className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${sourceCfg.color}15`,
                        color: sourceCfg.color,
                      }}
                    >
                      {sourceCfg.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
