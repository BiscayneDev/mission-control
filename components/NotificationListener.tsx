"use client"

import { useEffect, useRef } from "react"
import type { Toast } from "@/lib/useToast"

interface NotificationPayload {
  id: string
  agent: string
  message: string
  type: "start" | "finish" | "info"
  timestamp: number
}

interface Props {
  onNotification: (toast: Omit<Toast, "id">) => void
}

export function NotificationListener({ onNotification }: Props) {
  const seenIds = useRef<Set<string>>(new Set())
  const retryDelay = useRef(1000)
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const mounted = useRef(true)

  const handlePayload = (payload: NotificationPayload) => {
    if (seenIds.current.has(payload.id)) return
    seenIds.current.add(payload.id)
    // Keep seenIds bounded
    if (seenIds.current.size > 50) {
      const arr = Array.from(seenIds.current)
      seenIds.current = new Set(arr.slice(arr.length - 30))
    }
    onNotification({
      agent: payload.agent,
      message: payload.message,
      type: payload.type,
      timestamp: payload.timestamp,
    })
  }

  const startPolling = () => {
    if (pollInterval.current) return
    pollInterval.current = setInterval(async () => {
      try {
        const res = await fetch("/api/notify/recent")
        if (!res.ok) return
        const data = (await res.json()) as { notifications: NotificationPayload[] }
        for (const n of data.notifications) {
          handlePayload(n)
        }
      } catch {
        // ignore
      }
    }, 10000)
  }

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current)
      pollInterval.current = null
    }
  }

  const connectSSE = () => {
    if (!mounted.current) return

    try {
      const es = new EventSource("/api/notify/stream")
      esRef.current = es

      es.onopen = () => {
        retryDelay.current = 1000
        stopPolling()
      }

      es.onmessage = (event: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(event.data) as NotificationPayload
          handlePayload(payload)
        } catch {
          // ignore malformed
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        // SSE failed — start polling as fallback
        startPolling()
        // Exponential backoff reconnect (max 30s)
        if (!mounted.current) return
        setTimeout(() => {
          if (mounted.current) connectSSE()
        }, retryDelay.current)
        retryDelay.current = Math.min(retryDelay.current * 2, 30000)
      }
    } catch {
      startPolling()
    }
  }

  useEffect(() => {
    mounted.current = true
    connectSSE()
    // Always start polling as baseline fallback
    startPolling()

    return () => {
      mounted.current = false
      esRef.current?.close()
      esRef.current = null
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
