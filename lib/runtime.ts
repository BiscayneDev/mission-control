/**
 * Agent Runtime Abstraction
 *
 * Decouples Shipyard OS from any specific agent runtime (OpenClaw, LangGraph, CrewAI, etc).
 * API routes import from here instead of calling OpenClaw directly.
 *
 * To add a new provider:
 *   1. Implement the AgentRuntime interface
 *   2. Add it to the `createRuntime()` factory
 *   3. Set AGENT_RUNTIME=your-provider in .env.local
 */

import { execFile } from "child_process"
import { promisify } from "util"
import { GATEWAY_URL, GATEWAY_TOKEN, AGENT_DELIVERY_TARGET, OLLAMA_BASE_URL, OLLAMA_MODEL, BIN } from "./config"

const execFileAsync = promisify(execFile)

// ── Types ────────────────────────────────────────────────────────────────────

export interface RuntimeSession {
  key: string
  model?: string
  [key: string]: unknown
}

export interface ActivateParams {
  taskId: string
  title: string
  description?: string
  assignee?: string
  priority?: string
  callbackUrl: string
}

export interface ChatParams {
  message: string
  sessionId?: string
}

export interface AgentRuntime {
  /** Human-readable name of the runtime */
  readonly name: string

  /** Check if the runtime is reachable */
  healthCheck(): Promise<{ ok: boolean; version?: string; error?: string }>

  /** List active agent sessions */
  listSessions(): Promise<RuntimeSession[]>

  /** Send a message to an agent and get a reply (chat) */
  chat(params: ChatParams): Promise<string>

  /** Fire-and-forget: activate an agent for a task */
  activate(params: ActivateParams): Promise<void>

  /** Send a test message to a delivery channel */
  testDelivery(channel: string, target: string, message: string): Promise<void>
}

// ── OpenClaw Provider ────────────────────────────────────────────────────────

class OpenClawRuntime implements AgentRuntime {
  readonly name = "OpenClaw"

  async healthCheck() {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/health`, {
        headers: { Authorization: `Bearer ${GATEWAY_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }

      interface HealthData { version?: string; openclaw_version?: string; gateway_version?: string }
      const data = (await res.json().catch(() => ({}))) as HealthData
      const version = data.version ?? data.openclaw_version ?? data.gateway_version
      return { ok: true, version }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unreachable" }
    }
  }

  async listSessions(): Promise<RuntimeSession[]> {
    if (!GATEWAY_TOKEN) return []
    try {
      const res = await fetch(`${GATEWAY_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${GATEWAY_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      const data: unknown = await res.json()
      if (Array.isArray(data)) return data as RuntimeSession[]
      if (data && typeof data === "object" && "sessions" in data) {
        return (data as { sessions: RuntimeSession[] }).sessions
      }
      return []
    } catch {
      return []
    }
  }

  async chat({ message }: ChatParams): Promise<string> {
    // Try HTTP gateway first
    try {
      const res = await fetch(`${GATEWAY_URL}/api/agent/turn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({ message, sessionKey: "agent:main:main" }),
        signal: AbortSignal.timeout(30000),
      })

      if (res.ok) {
        interface GatewayReply { reply?: string; response?: string; text?: string; content?: string; message?: string }
        const data = (await res.json()) as GatewayReply
        const reply = data.reply ?? data.response ?? data.text ?? data.content ?? data.message
        if (reply) return reply
      }
    } catch {
      // Fall through to CLI
    }

    // Fallback: CLI
    try {
      const { stdout } = await execFileAsync(
        BIN.openclaw,
        ["agent", "--message", message, "--session-id", "agent:main:main", "--json"],
        { timeout: 30000 }
      )
      interface CLIReply { reply?: string; response?: string; text?: string; content?: string; output?: string }
      const parsed = JSON.parse(stdout) as CLIReply
      return parsed.reply ?? parsed.response ?? parsed.text ?? parsed.content ?? parsed.output ?? stdout.trim()
    } catch {
      return "Unable to reach agent runtime. Make sure the gateway is running."
    }
  }

  async activate({ message }: ActivateParams & { message: string }): Promise<void> {
    await execFileAsync(BIN.openclaw, ["agent", "--to", AGENT_DELIVERY_TARGET, "--message", message], {
      timeout: 30000,
      env: { ...process.env, PATH: `${BIN.openclaw.replace(/\/[^/]+$/, "")}:/usr/local/bin:/usr/bin:/bin` },
    }).catch(() => null)
  }

  async testDelivery(channel: string, target: string, message: string): Promise<void> {
    await execFileAsync(
      BIN.openclaw,
      ["message", "send", "--channel", channel.toLowerCase(), "--target", target, "--message", message],
      { timeout: 10000 }
    )
  }
}

// ── Ollama Provider (local models) ────────────────────────────────────────────
// Works with Ollama, LM Studio, llama.cpp server, or any OpenAI-compatible endpoint

interface OllamaModel {
  name: string
  model: string
  size: number
  digest: string
  modified_at: string
}

interface OllamaChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface OllamaChatResponse {
  message: OllamaChatMessage
  done: boolean
  total_duration?: number
  eval_count?: number
  prompt_eval_count?: number
}

class OllamaRuntime implements AgentRuntime {
  readonly name = "Ollama"

  async healthCheck() {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }

      const data = (await res.json()) as { models?: OllamaModel[] }
      const modelCount = data.models?.length ?? 0
      return { ok: true, version: `${modelCount} model${modelCount !== 1 ? "s" : ""} available` }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unreachable" }
    }
  }

  async listSessions(): Promise<RuntimeSession[]> {
    // Ollama doesn't have persistent sessions — return current model as a session
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/ps`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      const data = (await res.json()) as { models?: Array<{ name: string; size: number }> }
      return (data.models ?? []).map((m) => ({ key: m.name, model: m.name }))
    } catch {
      return []
    }
  }

  async chat({ message }: ChatParams): Promise<string> {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [{ role: "user", content: message }] as OllamaChatMessage[],
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return `Ollama error (${res.status}): ${text || "Unknown error"}. Is the model '${OLLAMA_MODEL}' pulled?`
      }

      const data = (await res.json()) as OllamaChatResponse
      return data.message?.content ?? "No response from model."
    } catch (err) {
      return `Unable to reach Ollama at ${OLLAMA_BASE_URL}. ${err instanceof Error ? err.message : ""}`
    }
  }

  async activate({ title, description }: ActivateParams): Promise<void> {
    // For local models, just run a chat completion as a fire-and-forget task
    const prompt = `Task: ${title}${description ? `\n\nDescription: ${description}` : ""}\n\nPlease work on this task.`
    await this.chat({ message: prompt }).catch(() => null)
  }

  async testDelivery(_channel: string, _target: string, message: string): Promise<void> {
    // Local models can't send to external channels — just verify the model responds
    const reply = await this.chat({ message })
    if (reply.startsWith("Unable to reach") || reply.startsWith("Ollama error")) {
      throw new Error(reply)
    }
  }

  /** List available models from Ollama */
  async listModels(): Promise<Array<{ name: string; size: number; modified: string }>> {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      const data = (await res.json()) as { models?: OllamaModel[] }
      return (data.models ?? []).map((m) => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at,
      }))
    } catch {
      return []
    }
  }
}

// ── Stub Provider (demo mode / no runtime) ───────────────────────────────────

class StubRuntime implements AgentRuntime {
  readonly name = "Demo"

  async healthCheck() {
    return { ok: true, version: "demo" }
  }

  async listSessions(): Promise<RuntimeSession[]> {
    return []
  }

  async chat(): Promise<string> {
    return "Running in demo mode — connect an agent runtime to activate chat."
  }

  async activate(): Promise<void> {
    // No-op in demo mode
  }

  async testDelivery(): Promise<void> {
    // No-op in demo mode
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

function createRuntime(): AgentRuntime {
  const provider = process.env.AGENT_RUNTIME?.toLowerCase() ?? "openclaw"

  // On Vercel or explicit demo mode, use stub
  if (process.env.VERCEL || process.env.VERCEL_ENV || provider === "demo") {
    return new StubRuntime()
  }

  switch (provider) {
    case "openclaw":
      return new OpenClawRuntime()
    case "ollama":
    case "local":
    case "lmstudio":
    case "llamacpp":
      return new OllamaRuntime()
    default:
      return new OpenClawRuntime()
  }
}

/** Singleton runtime instance */
export const runtime = createRuntime()
