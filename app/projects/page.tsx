"use client"

import { useEffect, useState } from "react"

interface Repo {
  name: string
  description: string | null
  url: string
  updatedAt: string
  primaryLanguage: { name: string } | null
  isPrivate: boolean
}

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Solidity: "#AA6746",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Ruby: "#701516",
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

export default function ProjectsPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch("/api/projects")
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setRepos(data)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchRepos()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-sm text-zinc-500">BiscayneDev on GitHub</p>
        </div>
        <a
          href="https://github.com/BiscayneDev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium transition-colors hover:text-white"
          style={{ color: "#7c3aed" }}
        >
          Open GitHub &rarr;
        </a>
      </div>

      {error ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: "#111118",
            border: "1px solid #1a1a2e",
          }}
        >
          <p className="text-zinc-500 text-sm">
            Could not load repositories. Make sure the{" "}
            <code className="text-zinc-400">gh</code> CLI is installed and
            authenticated.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map((repo) => {
            const lang = repo.primaryLanguage?.name
            const langColor = lang
              ? LANGUAGE_COLORS[lang] || "#71717a"
              : null

            return (
              <a
                key={repo.name}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl p-5 space-y-3 transition-shadow"
                style={{
                  backgroundColor: "#111118",
                  border: "1px solid #1a1a2e",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 20px rgba(124, 58, 237, 0.15)"
                  e.currentTarget.style.borderColor =
                    "rgba(124, 58, 237, 0.3)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none"
                  e.currentTarget.style.borderColor = "#1a1a2e"
                }}
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">
                    {repo.name}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {repo.description || "No description"}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {lang && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: langColor || undefined }}
                        />
                        <span className="text-xs text-zinc-400">{lang}</span>
                      </div>
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: repo.isPrivate
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(34, 197, 94, 0.15)",
                        color: repo.isPrivate ? "#ef4444" : "#22c55e",
                      }}
                    >
                      {repo.isPrivate ? "Private" : "Public"}
                    </span>
                  </div>

                  <span className="text-xs text-zinc-600">
                    {relativeTime(repo.updatedAt)}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
