"use client"

import { useState, useCallback } from "react"

export interface Toast {
  id: string
  agent: string
  message: string
  type: "start" | "finish" | "info"
  timestamp: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const newToast: Toast = { ...toast, id }

      setToasts((prev) => {
        const next = [newToast, ...prev]
        // Max 3 visible — drop the oldest
        return next.slice(0, 3)
      })

      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 6000)
    },
    []
  )

  return { toasts, addToast, removeToast }
}
