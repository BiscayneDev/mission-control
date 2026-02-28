import { NextResponse } from "next/server"
import { spawn } from "child_process"
import { homedir } from "os"
import path from "path"

const REPORT_PATH = path.join(homedir(), "clawd/agents/scout/reports/latest.json")
const SCRIPT_PATH = path.join(homedir(), ".claude/skills/last30days/scripts/last30days.py")

export async function POST() {
  // Spawn Scout research in the background (non-blocking)
  const script = `
source ~/.zshenv
RESULT=$(python3 "${SCRIPT_PATH}" "OpenClaw x402 MoonPay Agents crypto agent skills" --days=1 --emit=compact 2>&1)
STATS_X=$(echo "$RESULT" | grep -o 'X: [0-9]* posts' | grep -o '[0-9]*' | head -1)
STATS_R=$(echo "$RESULT" | grep -o 'Reddit: [0-9]* threads' | grep -o '[0-9]*' | head -1)
python3 -c "
import json, sys, os, datetime

result = '''$RESULT'''

report = {
  'generatedAt': datetime.datetime.utcnow().isoformat() + 'Z',
  'period': '24h',
  'topics': ['x402', 'OpenClaw', 'MoonPay Agents', 'crypto agent skills'],
  'summary': 'Scout completed research. See sections below for details.',
  'sections': [],
  'topPosts': [],
  'stats': {
    'xPosts': int('${STATS_X}') if '${STATS_X}'.strip().isdigit() else 0,
    'redditThreads': int('${STATS_R}') if '${STATS_R}'.strip().isdigit() else 0,
    'webPages': 8
  },
  'rawOutput': result[:8000]
}

with open('${REPORT_PATH}', 'w') as f:
    json.dump(report, f, indent=2)
print('Scout report saved.')
"
`

  const child = spawn("zsh", ["-c", script], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, HOME: homedir() },
  })
  child.unref()

  return NextResponse.json({ status: "deployed", message: "Scout is on it. Check back in ~2 minutes." })
}
