"use client"

import { useToast } from "@/lib/useToast"
import { ToastContainer } from "@/components/Toast"
import { NotificationListener } from "@/components/NotificationListener"

export function ToastProvider() {
  const { toasts, addToast, removeToast } = useToast()

  return (
    <>
      <NotificationListener onNotification={addToast} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
