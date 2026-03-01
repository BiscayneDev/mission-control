import { NextResponse } from "next/server"

interface Session {
  key: string
  model?: string
  status?: string
  startedAt?: string
  [key: string]: unknown
}

interface SessionsResponse {
  sessions: Session[]
}

export async function GET() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json({ sessions: [] } satisfies SessionsResponse)
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch("http://127.0.0.1:18789/api/sessions", {
      headers: {
        Authorization: "Bearer f062a35b477a3c87a59b897728cd96afb84a970b3faa6093",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      return NextResponse.json({ sessions: [] } satisfies SessionsResponse)
    }

    const data: unknown = await res.json()

    // Gateway may return array or { sessions: [...] }
    if (Array.isArray(data)) {
      return NextResponse.json({ sessions: data as Session[] } satisfies SessionsResponse)
    }

    if (data && typeof data === "object" && "sessions" in data) {
      return NextResponse.json(data as SessionsResponse)
    }

    return NextResponse.json({ sessions: [] } satisfies SessionsResponse)
  } catch {
    return NextResponse.json({ sessions: [] } satisfies SessionsResponse)
  }
}
