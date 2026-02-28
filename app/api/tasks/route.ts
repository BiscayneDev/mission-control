import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import type { Task } from "@/lib/tasks"

const DATA_PATH = join(process.cwd(), "data", "tasks.json")

async function readTasks(): Promise<Task[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8")
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeTasks(tasks: Task[]): Promise<void> {
  await writeFile(DATA_PATH, JSON.stringify(tasks, null, 2), "utf-8")
}

export async function GET() {
  const tasks = await readTasks()
  return NextResponse.json(tasks)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const tasks = await readTasks()

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: body.title,
      description: body.description || "",
      column: body.column || "backlog",
      priority: body.priority || "medium",
      assignee: body.assignee || "unassigned",
      tags: body.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updated = [...tasks, newTask]
    await writeTasks(updated)

    return NextResponse.json(newTask, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create task" }, { status: 400 })
  }
}
