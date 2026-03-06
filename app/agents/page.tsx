"use client"

import { useEffect, useState, useCallback } from "react"
import type { AgentData } from "@/app/api/agents/route"

// Session key → agent display info
const SESSION_AGENT_MAP: Record<string, { emoji: string; name: string }> = {
  main: { emoji: "🦞", name: "Vic" },
  subagent: { emoji: "⚡", name: "Builder" },
  builder: { emoji: "⚡", name: "Builder" },
  scout: { emoji: "🔭", name: "Scout" },
  dealflow: { emoji: "🤝", name: "Deal Flow" },
  "deal-flow": { emoji: "🤝", name: "Deal Flow" },
  wallet: { emoji: "🏦", name: "Baron" },
}

function resolveSession(key: string): { emoji: string; name: string } {
  const lower = key.toLowerCase()
  for (const [pattern, info] of Object.entries(SESSION_AGENT_MAP)) {
    if (lower.includes(pattern)) return info
  }
  return { emoji: "🤖", name: key }
}

interface Session {
  key?: string
  id?: string
  label?: string
  model?: string
  status?: string
  startedAt?: string
  created_at?: string
  [key: string]: unknown
}

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

function truncateModel(model: string): string {
  return model.replace(/^(anthropic|openai|google)\//, "").slice(0, 30)
}

const PURPLE = "#7c3aed"
const GREEN = "#22c55e"

// ── Agent Modal ───────────────────────────────────────────────────────────────

interface AgentModalProps {
  agent: AgentData | null  // null = create mode
  onClose: () => void
  onSave: (data: Partial<AgentData>) => Promise<void>
}

function AgentModal({ agent, onClose, onSave }: AgentModalProps) {
  const isCreate = agent === null
  const [name, setName] = useState(agent?.name ?? "")
  const [emoji, setEmoji] = useState(agent?.emoji ?? "🤖")
  const [role, setRole] = useState(agent?.role ?? "")
  const [description, setDescription] = useState(agent?.description ?? "")
  const [accent, setAccent] = useState(agent?.accent ?? "#6366f1")
  const [tagsInput, setTagsInput] = useState(agent?.tags?.join(", ") ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
      await onSave({ name, emoji, role, description, accent, tags })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 space-y-4"
        style={{
          backgroundColor: "#111118",
          border: `1px solid ${PURPLE}40`,
          boxShadow: `0 0 40px ${PURPLE}20`,
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            {isCreate ? "New Agent" : `Edit ${agent.name}`}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div className="w-20">
              <label className="block text-xs text-zinc-500 mb-1">Emoji</label>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-center text-xl"
                style={{
                  backgroundColor: "#0a0a0f",
                  border: "1px solid #27272a",
                  color: "white",
                  outline: "none",
                }}
                maxLength={4}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: "#0a0a0f",
                  border: "1px solid #27272a",
                  color: "white",
                  outline: "none",
                }}
                placeholder="Agent name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: "#0a0a0f",
                border: "1px solid #27272a",
                color: "white",
                outline: "none",
              }}
              placeholder="e.g. Market Intelligence"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                backgroundColor: "#0a0a0f",
                border: "1px solid #27272a",
                color: "white",
                outline: "none",
              }}
              rows={3}
              placeholder="What does this agent do?"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Accent Color</label>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-md border border-zinc-700 shrink-0"
                style={{ backgroundColor: accent }}
              />
              <input
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                style={{
                  backgroundColor: "#0a0a0f",
                  border: "1px solid #27272a",
                  color: "white",
                  outline: "none",
                }}
                placeholder="#7c3aed"
              />
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-zinc-700"
                style={{ backgroundColor: "transparent", padding: "1px" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Tags (comma-separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: "#0a0a0f",
                border: "1px solid #27272a",
                color: "white",
                outline: "none",
              }}
              placeholder="DeFi, Solana, Yield"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              style={{ backgroundColor: "#1a1a22", border: "1px solid #27272a" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors"
              style={{
                backgroundColor: saving ? `${PURPLE}40` : PURPLE,
                color: "white",
                border: `1px solid ${PURPLE}60`,
              }}
            >
              {saving ? "Saving…" : isCreate ? "Create Agent" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────

interface DeleteDialogProps {
  agent: AgentData
  onClose: () => void
  onConfirm: () => Promise<void>
}

function DeleteDialog({ agent, onClose, onConfirm }: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 space-y-4"
        style={{
          backgroundColor: "#111118",
          border: "1px solid rgba(239,68,68,0.3)",
          boxShadow: "0 0 40px rgba(239,68,68,0.1)",
        }}
      >
        <div className="text-center space-y-2">
          <div className="text-3xl">{agent.emoji}</div>
          <h2 className="text-sm font-bold text-white">Delete {agent.name}?</h2>
          <p className="text-xs text-zinc-500">This cannot be undone. The agent will be removed permanently.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            style={{ backgroundColor: "#1a1a22", border: "1px solid #27272a" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-white transition-colors"
            style={{
              backgroundColor: deleting ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.8)",
              border: "1px solid rgba(239,68,68,0.4)",
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [activity, setActivity] = useState<ActivityResponse | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  // Modal state: undefined = closed, null = create mode, AgentData = edit mode
  const [editAgent, setEditAgent] = useState<AgentData | null | undefined>(undefined)
  const [deleteAgent, setDeleteAgent] = useState<AgentData | null>(null)

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", { cache: "no-store" })
      const data: AgentData[] = await res.json()
      setAgents(data)
    } catch {
      // ignore
    } finally {
      setAgentsLoading(false)
    }
  }, [])

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

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", { cache: "no-store" })
      const data: { sessions: Session[] } = await res.json()
      setSessions(data.sessions ?? [])
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
    fetchActivity()
    fetchSessions()

    const activityInterval = setInterval(fetchActivity, 30_000)
    const sessionsInterval = setInterval(fetchSessions, 15_000)

    return () => {
      clearInterval(activityInterval)
      clearInterval(sessionsInterval)
    }
  }, [fetchAgents, fetchActivity, fetchSessions])

  async function handleSave(data: Partial<AgentData>) {
    if (editAgent === null) {
      // Create new agent
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const created: AgentData = await res.json()
        setAgents((prev) => [...prev, created])
      }
    } else if (editAgent) {
      // Optimistic update
      setAgents((prev) =>
        prev.map((a) => (a.id === editAgent.id ? { ...a, ...data } : a))
      )
      await fetch(`/api/agents/${editAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await fetchAgents()
    }
  }

  async function handleDelete(agent: AgentData) {
    // Optimistic remove
    setAgents((prev) => prev.filter((a) => a.id !== agent.id))
    await fetch(`/api/agents/${agent.id}`, { method: "DELETE" })
    await fetchAgents()
  }

  const vicAgent = agents.find((a) => a.isVic)
  const otherAgents = agents.filter((a) => !a.isVic)
  const displayEvents = activity?.events?.slice(0, 8) ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-4 h-full">
      {/* Mission Banner */}
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

      {/* Vic hero row */}
      {agentsLoading ? (
        <div
          className="rounded-lg p-4 animate-pulse"
          style={{ backgroundColor: "#111118", border: "1px solid #27272a" }}
        >
          <div className="h-12 bg-zinc-800 rounded" />
        </div>
      ) : vicAgent ? (
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: "#111118",
            border: `1px solid ${vicAgent.accent}38`,
            boxShadow: `0 0 30px ${vicAgent.accent}08`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-lg text-2xl shrink-0"
              style={{ width: "48px", height: "48px", backgroundColor: `${vicAgent.accent}18` }}
            >
              {vicAgent.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-white">{vicAgent.name}</span>
                <span className="text-xs" style={{ color: vicAgent.accent }}>
                  {vicAgent.role} · Orchestrator
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">{vicAgent.description}</p>
            </div>
            <div className="hidden sm:flex gap-1.5 shrink-0 flex-wrap">
              {vicAgent.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${vicAgent.accent}12`,
                    color: vicAgent.accent,
                    border: `1px solid ${vicAgent.accent}25`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <button
              onClick={() => setEditAgent(vicAgent)}
              title="Edit Vic"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors text-sm"
            >
              ✎
            </button>
          </div>
        </div>
      ) : null}

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

      {/* Agent grid header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-600">
          Team ({otherAgents.length})
        </p>
        <button
          onClick={() => setEditAgent(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: `${PURPLE}15`,
            color: "#a78bfa",
            border: `1px solid ${PURPLE}30`,
          }}
        >
          <span>+</span>
          <span>New Agent</span>
        </button>
      </div>

      {/* Agent Grid */}
      {agentsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg p-4 animate-pulse"
              style={{ backgroundColor: "#111118", border: "1px solid #27272a" }}
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-md bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-zinc-800 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {otherAgents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg p-4 relative group"
              style={{
                backgroundColor: "#111118",
                border: `1px solid ${agent.accent}28`,
                boxShadow: `0 0 20px ${agent.accent}0a`,
              }}
            >
              {/* Edit / Delete buttons — appear on hover */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditAgent(agent)}
                  title="Edit agent"
                  className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors text-xs"
                >
                  ✎
                </button>
                <button
                  onClick={() => setDeleteAgent(agent)}
                  title="Delete agent"
                  className="w-6 h-6 flex items-center justify-center rounded text-zinc-700 hover:text-red-400 hover:bg-red-500/5 transition-colors text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className="flex items-center justify-center rounded-md text-xl shrink-0"
                  style={{ width: "40px", height: "40px", backgroundColor: `${agent.accent}18` }}
                >
                  {agent.emoji}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5 pr-8">
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

          {otherAgents.length === 0 && (
            <div
              className="col-span-2 rounded-lg p-8 text-center"
              style={{ backgroundColor: "#111118", border: "1px solid #27272a" }}
            >
              <p className="text-sm text-zinc-500">No agents yet</p>
              <p className="text-xs text-zinc-700 mt-1">Click &ldquo;+ New Agent&rdquo; to add one</p>
            </div>
          )}
        </div>
      )}

      {/* Live Sessions Panel */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "#111118",
          border: `1px solid ${GREEN}28`,
          boxShadow: `0 0 20px ${GREEN}08`,
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: `${GREEN}20` }}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: GREEN }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: GREEN }}
              />
            </span>
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Live Sessions
            </p>
            {!sessionsLoading && sessions.length > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: `${GREEN}20`, color: GREEN }}
              >
                {sessions.length}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-700">refreshes every 15s</p>
        </div>

        {sessionsLoading ? (
          <div className="px-5 py-4 text-center">
            <p className="text-xs text-zinc-600">Connecting to gateway...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-5 py-4 text-center space-y-0.5">
            <p className="text-xs text-zinc-500">All quiet</p>
            <p className="text-xs text-zinc-700">No active sessions right now</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/30">
            {sessions.map((session, idx) => {
              const key = session.key ?? session.id ?? session.label ?? String(idx)
              const { emoji, name } = resolveSession(key)
              const model = session.model ? truncateModel(String(session.model)) : null
              const startedAt = session.startedAt ?? session.created_at
              const status = session.status ?? "active"

              return (
                <div
                  key={key}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-base shrink-0">{emoji}</span>
                  <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-300">{name}</span>
                    <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[160px]">
                      {key}
                    </span>
                    {model && (
                      <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[160px]">
                        · {model}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                      style={{
                        backgroundColor: `${GREEN}15`,
                        color: GREEN,
                        border: `1px solid ${GREEN}30`,
                      }}
                    >
                      {status}
                    </span>
                    {startedAt && (
                      <span className="text-[10px] text-zinc-700 hidden sm:inline">
                        {timeAgo(String(startedAt))}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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

      {/* Modals */}
      {editAgent !== undefined && (
        <AgentModal
          agent={editAgent}
          onClose={() => setEditAgent(undefined)}
          onSave={handleSave}
        />
      )}

      {deleteAgent && (
        <DeleteDialog
          agent={deleteAgent}
          onClose={() => setDeleteAgent(null)}
          onConfirm={() => handleDelete(deleteAgent)}
        />
      )}
    </div>
  )
}
