import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

export interface Goal {
  id: string
  title: string
  description?: string
  status: "active" | "completed" | "paused"
  priority: "high" | "medium" | "low"
  assignedTo?: string
  createdAt?: string
}

const DATA_PATH = path.join(process.cwd(), "data", "goals.json")

async function readGoals(): Promise<Goal[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8")
    return JSON.parse(raw) as Goal[]
  } catch {
    return []
  }
}

async function writeGoals(goals: Goal[]): Promise<void> {
  await writeFile(DATA_PATH, JSON.stringify(goals, null, 2), "utf-8")
}

export async function GET() {
  const goals = await readGoals()
  return NextResponse.json(goals)
}

export async function POST(request: Request) {
  const body = await request.json() as {
    title: string
    description?: string
    status?: "active" | "completed" | "paused"
    priority?: "high" | "medium" | "low"
    assignedTo?: string
  }

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const goal: Goal = {
    id: `goal-${randomUUID().slice(0, 8)}`,
    title: body.title,
    description: body.description,
    status: body.status ?? "active",
    priority: body.priority ?? "medium",
    assignedTo: body.assignedTo,
    createdAt: new Date().toISOString(),
  }

  const goals = await readGoals()
  goals.push(goal)
  await writeGoals(goals)

  return NextResponse.json(goal, { status: 201 })
}
