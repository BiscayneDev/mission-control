"use client"

import { useEffect, useState } from "react"

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string | null
  location: string | null
  allDay: boolean
}

const CYAN = "#06b6d4"

function formatTime(iso: string, allDay: boolean): string {
  if (allDay) return "All day"
  const d = new Date(iso)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00")
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)

  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff > 0 && diff < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" })
  }
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const day = ev.start.split("T")[0]
    const existing = map.get(day) ?? []
    map.set(day, [...existing, ev])
  }
  return map
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/calendar", { cache: "no-store" })
        const data: { events: CalendarEvent[] } = await res.json()
        setEvents(data.events ?? [])
      } catch {
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const grouped = groupByDay(events)
  const sortedDays = Array.from(grouped.keys()).sort()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">Calendar</h1>
          <p className="text-sm text-zinc-500">Upcoming events from Google Calendar</p>
        </div>
        <div
          className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: CYAN }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: CYAN }}
          />
          Live
        </div>
      </div>

      {loading ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          <p className="text-zinc-500 text-sm">Loading calendar...</p>
        </div>
      ) : events.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center space-y-2"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          <div className="text-4xl">📅</div>
          <p className="text-zinc-400 font-medium">No upcoming events</p>
          <p className="text-zinc-600 text-sm">
            Your calendar is clear — or the gog CLI needs to be authenticated.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedDays.map((day) => {
            const dayEvents = grouped.get(day) ?? []
            return (
              <div key={day} className="space-y-2">
                {/* Day header */}
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-mono font-bold uppercase tracking-widest"
                    style={{ color: CYAN }}
                  >
                    {formatDateLabel(day)}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "#1a1a2e" }} />
                </div>

                {/* Events for this day */}
                <div className="space-y-2">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-xl px-5 py-4 flex items-start gap-4 transition-all"
                      style={{
                        backgroundColor: "#111118",
                        border: "1px solid #1a1a2e",
                        borderLeft: `3px solid ${CYAN}`,
                      }}
                    >
                      {/* Time */}
                      <div className="shrink-0 text-right" style={{ minWidth: "64px" }}>
                        <span className="text-xs font-mono text-zinc-400">
                          {formatTime(ev.start, ev.allDay)}
                        </span>
                      </div>

                      {/* Event details */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-white leading-snug">
                          {ev.title}
                        </p>
                        {ev.location && (
                          <p className="text-xs text-zinc-500 truncate">
                            📍 {ev.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
