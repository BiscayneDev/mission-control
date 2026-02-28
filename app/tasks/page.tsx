"use client"

import { useEffect, useState, useCallback } from "react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd"
import type { Task, Column, Priority, Agent } from "@/lib/tasks"
import {
  COLUMNS,
  AGENT_EMOJI,
  AGENT_LABELS,
  PRIORITY_CONFIG,
} from "@/lib/tasks"

const COLUMN_COLORS: Record<Column, string> = {
  backlog: "#6366f1",
  "in-progress": "#f59e0b",
  "in-review": "#06b6d4",
  done: "#22c55e",
}

interface AddTaskFormState {
  title: string
  assignee: Agent
  priority: Priority
}

const INITIAL_FORM: AddTaskFormState = {
  title: "",
  assignee: "unassigned",
  priority: "medium",
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [addingTo, setAddingTo] = useState<Column | null>(null)
  const [form, setForm] = useState<AddTaskFormState>(INITIAL_FORM)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks")
      const data = await res.json()
      setTasks(data)
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result
    if (!destination) return

    const newColumn = destination.droppableId as Column
    const task = tasks.find((t) => t.id === draggableId)
    if (!task || task.column === newColumn) return

    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, column: newColumn } : t))
    )

    try {
      await fetch(`/api/tasks/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: newColumn }),
      })
    } catch {
      fetchTasks()
    }
  }

  const handleAddTask = async (column: Column) => {
    if (!form.title.trim()) return

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          column,
          priority: form.priority,
          assignee: form.assignee,
          tags: [],
        }),
      })
      const newTask = await res.json()
      setTasks((prev) => [...prev, newTask])
      setForm(INITIAL_FORM)
      setAddingTo(null)
    } catch {
      // silently fail
    }
  }

  const tasksByColumn = (column: Column) =>
    tasks.filter((t) => t.column === column)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Loading tasks...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white">Tasks</h1>
        <p className="text-sm text-zinc-600">
          Vic delegates. Agents execute.
        </p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map(({ id: colId, label }) => {
            const colTasks = tasksByColumn(colId)
            const accent = COLUMN_COLORS[colId]

            return (
              <div key={colId} className="space-y-3">
                {/* Column Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-sm font-semibold uppercase tracking-wider"
                      style={{ color: accent }}
                    >
                      {label}
                    </h2>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${accent}20`,
                        color: accent,
                      }}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Column */}
                <Droppable droppableId={colId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 min-h-[200px] rounded-lg p-2 transition-colors"
                      style={{
                        backgroundColor: snapshot.isDraggingOver
                          ? `${accent}08`
                          : "transparent",
                      }}
                    >
                      {colTasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="rounded-lg p-4 space-y-3 transition-shadow"
                              style={{
                                backgroundColor: "#111118",
                                borderLeft: `3px solid ${PRIORITY_CONFIG[task.priority].border}`,
                                border: `1px solid ${snapshot.isDragging ? `${accent}60` : "#1a1a2e"}`,
                                borderLeftWidth: "3px",
                                borderLeftColor:
                                  PRIORITY_CONFIG[task.priority].border,
                                boxShadow: snapshot.isDragging
                                  ? `0 0 20px ${accent}20`
                                  : "none",
                                ...provided.draggableProps.style,
                              }}
                            >
                              <p className="text-sm font-semibold text-white leading-tight">
                                {task.title}
                              </p>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="flex items-center justify-center w-6 h-6 rounded-full text-xs"
                                    style={{
                                      backgroundColor: "#1a1a2e",
                                    }}
                                    title={AGENT_LABELS[task.assignee]}
                                  >
                                    {AGENT_EMOJI[task.assignee]}
                                  </span>
                                  <span className="text-xs text-zinc-500">
                                    {AGENT_LABELS[task.assignee]}
                                  </span>
                                </div>

                                <span
                                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{
                                    backgroundColor: `${PRIORITY_CONFIG[task.priority].color}20`,
                                    color:
                                      PRIORITY_CONFIG[task.priority].color,
                                  }}
                                >
                                  {PRIORITY_CONFIG[task.priority].label}
                                </span>
                              </div>

                              {task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {task.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs px-2 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: "#1a1a2e",
                                        color: "#71717a",
                                      }}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Add Task */}
                {addingTo === colId ? (
                  <div
                    className="rounded-lg p-3 space-y-2"
                    style={{
                      backgroundColor: "#111118",
                      border: "1px solid #1a1a2e",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Task title..."
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      className="w-full bg-transparent text-sm text-white placeholder-zinc-600 outline-none border-b border-zinc-800 pb-2"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTask(colId)
                        if (e.key === "Escape") {
                          setAddingTo(null)
                          setForm(INITIAL_FORM)
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <select
                        value={form.assignee}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            assignee: e.target.value as Agent,
                          })
                        }
                        className="flex-1 text-xs bg-[#0a0a0f] text-zinc-400 border border-zinc-800 rounded px-2 py-1 outline-none"
                      >
                        {(
                          Object.keys(AGENT_LABELS) as Agent[]
                        ).map((a) => (
                          <option key={a} value={a}>
                            {AGENT_EMOJI[a]} {AGENT_LABELS[a]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={form.priority}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            priority: e.target.value as Priority,
                          })
                        }
                        className="flex-1 text-xs bg-[#0a0a0f] text-zinc-400 border border-zinc-800 rounded px-2 py-1 outline-none"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddTask(colId)}
                        className="flex-1 text-xs font-medium py-1.5 rounded"
                        style={{
                          backgroundColor: `${accent}20`,
                          color: accent,
                        }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingTo(null)
                          setForm(INITIAL_FORM)
                        }}
                        className="flex-1 text-xs font-medium py-1.5 rounded text-zinc-500 hover:text-zinc-300"
                        style={{ backgroundColor: "#1a1a2e" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingTo(colId)
                      setForm(INITIAL_FORM)
                    }}
                    className="w-full text-xs text-zinc-600 hover:text-zinc-400 py-2 rounded-lg transition-colors"
                    style={{
                      border: "1px dashed #1a1a2e",
                    }}
                  >
                    + Add Task
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
