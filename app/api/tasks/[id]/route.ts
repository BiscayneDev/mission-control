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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const tasks = await readTasks()

    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const updatedTask: Task = {
      ...tasks[index],
      ...body,
      id: tasks[index].id,
      createdAt: tasks[index].createdAt,
      updatedAt: new Date().toISOString(),
    }

    const updated = tasks.map((t, i) => (i === index ? updatedTask : t))
    await writeTasks(updated)

    return NextResponse.json(updatedTask)
  } catch {
    return NextResponse.json({ error: "Failed to update task" }, { status: 400 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tasks = await readTasks()

    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const updated = tasks.filter((t) => t.id !== id)
    await writeTasks(updated)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 400 })
  }
}
