"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  CheckSquare,
  Folder,
  Zap,
  Brain,
  Calendar,
  FileText,
  Sparkles,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/intel", label: "Intel", icon: Zap },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/docs", label: "Docs", icon: FileText },
  { href: "/skills", label: "Skills", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col items-center gap-1 py-6 px-2"
      style={{
        width: "13rem",
        backgroundColor: "#0d0d14",
        borderRight: "1px solid #1a1a2e",
        minHeight: "100vh",
      }}
    >
      <div className="mb-6 text-center">
        <span className="text-sm font-bold tracking-widest uppercase text-zinc-400">
          Mission
        </span>
        <br />
        <span className="text-xs tracking-widest uppercase text-zinc-600">
          Control
        </span>
      </div>

      <nav className="flex flex-col gap-1 w-full">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
