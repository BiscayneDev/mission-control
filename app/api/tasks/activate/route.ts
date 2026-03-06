import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"
import { notificationEmitter, addRecentNotification } from "@/lib/notificationEmitter"
import type { NotificationPayload } from "@/lib/notificationEmitter"

const execFileAsync = promisify(execFile)
const OPENCLAW = "/opt/homebrew/bin/openclaw"

export async function POST(request: Request) {
  try {
    const { taskId, title, description, assignee, priority } = await request.json() as {
      taskId?: string
      title?: string
      description?: string
      assignee?: string
      priority?: string
    }

    if (!taskId || !title) {
      return NextResponse.json({ error: "taskId and title required" }, { status: 400 })
    }

    const agentMap: Record<string, string> = {
      builder: "⚡ Builder",
      scout: "🔭 Scout",
      "deal-flow": "🤝 Deal Flow",
      baron: "🏦 Baron",
      vic: "🦞 Vic",
      unassigned: "whoever is best suited",
    }
    const agentName = agentMap[assignee ?? "unassigned"] || "whoever is best suited"

    const message = [
      `🎯 Task activated from Mission Control:`,
      ``,
      `Task: ${title}`,
      description ? `Description: ${description}` : null,
      `Priority: ${priority || "medium"}`,
      `Assigned to: ${agentName}`,
      `Task ID: ${taskId}`,
      ``,
      `Please action this now. Delegate to ${agentName} if appropriate.`,
    ].filter(Boolean).join("\n")

    // Send to our Telegram chat — Vic picks it up and acts on it
    execFileAsync(OPENCLAW, [
      "message", "send",
      "--channel", "telegram",
      "--target", "264452755",
      "--message", message,
    ], {
      timeout: 15000,
      env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" }
    }).catch(() => null)

    // Fire toast notification in Mission Control
    const agentKey = assignee || "vic"
    const notifyPayload: NotificationPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      agent: agentKey,
      message: `🎯 Task activated: ${title}`,
      type: "start",
      timestamp: Date.now(),
    }
    addRecentNotification(notifyPayload)
    notificationEmitter.emit("notification", notifyPayload)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to activate task" }, { status: 500 })
  }
}
