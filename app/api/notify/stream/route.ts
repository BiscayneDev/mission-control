import { notificationEmitter } from "@/lib/notificationEmitter"
import type { NotificationPayload } from "@/lib/notificationEmitter"

export const dynamic = "force-dynamic"

export async function GET() {
  // Vercel serverless doesn't support long-lived SSE — return a stub and close
  if (process.env.VERCEL) {
    const body = ": vercel-no-sse\n\n"
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "close",
      },
    })
  }

  // Local dev: real SSE stream
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const send = (payload: NotificationPayload) => {
        try {
          const data = `data: ${JSON.stringify(payload)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch {
          // Client disconnected
        }
      }

      // Send a comment immediately to keep connection alive
      controller.enqueue(encoder.encode(": connected\n\n"))

      notificationEmitter.on("notification", send)

      cleanup = () => {
        notificationEmitter.off("notification", send)
      }
    },
    cancel() {
      if (cleanup) cleanup()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
