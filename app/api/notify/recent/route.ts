import { NextResponse } from "next/server"
import { recentNotifications } from "@/lib/notificationEmitter"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({ notifications: recentNotifications })
}
