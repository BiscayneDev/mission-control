import { NextResponse } from "next/server"

export async function GET() {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    }
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    // Use /user/repos when authenticated (returns private repos too)
    // Fall back to /users/:username/repos for unauthenticated
    const endpoint = process.env.GITHUB_TOKEN
      ? "https://api.github.com/user/repos?sort=updated&per_page=20&affiliation=owner"
      : "https://api.github.com/users/BiscayneDev/repos?sort=updated&per_page=20"

    const res = await fetch(endpoint, { headers, next: { revalidate: 300 } })
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const data = await res.json()

    const repos = data.map((r: Record<string, unknown>) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      updatedAt: r.updated_at,
      primaryLanguage: r.language ? { name: r.language } : null,
      isPrivate: r.private,
    }))

    return NextResponse.json(repos)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
