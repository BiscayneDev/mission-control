import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)
const OPENCLAW = "/opt/homebrew/bin/openclaw"

export async function POST(request: Request) {
  try {
    const { taskId, title, description, assignee, priority } = await request.json()

    if (!taskId || !title) {
      return NextResponse.json({ error: "taskId and title required" }, { status: 400 })
    }

    const agentMap: Record<string, string> = {
      builder: "⚡ Builder",
      scout: "🔭 Scout",
      "deal-flow": "🤝 Deal Flow",
      baron: "🏦 Baron",
      vic: "🦞 Vic",
      unassigned: "unassigned",
    }
    const agentName = agentMap[assignee] || "unassigned"

    const message = [
      `🎯 [TASK ACTIVATED — ACTION REQUIRED]`,
      ``,
      `Title: ${title}`,
      description ? `Notes: ${description}` : `Notes: (none)`,
      `Priority: ${priority || "medium"}`,
      `Suggested agent: ${agentName}`,
      `Task ID: ${taskId}`,
      ``,
      `As Chief of Staff: read this task, improve and expand it into a proper brief, then delegate to the right agent (or handle yourself). Update the task card with your plan. Do not ask me to clarify — use your judgment and act.`,
    ].filter(Boolean).join("\n")

    execFileAsync(OPENCLAW, [
      "message", "send",
      "--channel", "telegram",
      "--target", "264452755",
      "--message", message,
    ], {
      timeout: 15000,
      env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" }
    }).catch(() => null)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to activate task" }, { status: 500 })
  }
}
