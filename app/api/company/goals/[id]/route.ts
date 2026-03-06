import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import path from "path"
import type { Goal } from "../route"

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json() as Partial<Goal>

  const goals = await readGoals()
  const index = goals.findIndex((g) => g.id === id)

  if (index === -1) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })
  }

  goals[index] = { ...goals[index], ...body, id }
  await writeGoals(goals)

  return NextResponse.json(goals[index])
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const goals = await readGoals()
  const filtered = goals.filter((g) => g.id !== id)

  if (filtered.length === goals.length) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })
  }

  await writeGoals(filtered)
  return NextResponse.json({ ok: true })
}
