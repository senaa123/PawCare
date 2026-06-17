"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Video, Cat, Bell,
  BarChart2, Zap, Camera, LogOut, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/dashboard",   label: "Dashboard",       icon: LayoutDashboard },
  { href: "/monitoring",  label: "Live Monitoring",  icon: Video },
  { href: "/cats",        label: "My Cats",          icon: Cat },
  { href: "/alerts",      label: "Alerts",           icon: Bell },
  { href: "/analytics",   label: "Analytics",        icon: BarChart2 },
  { href: "/automation",  label: "Automation",       icon: Zap },
  { href: "/streams",     label: "Cameras",          icon: Camera },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white shadow-nav border-r border-border flex-shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="font-display text-lg font-bold text-text">PawCare</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-pawblue-light text-pawblue-dark"
                  : "text-text-muted hover:bg-muted hover:text-text"
              )}
            >
              <Icon
                size={18}
                className={cn(
                  "flex-shrink-0 transition-colors",
                  active ? "text-pawblue-dark" : "text-text-light group-hover:text-text-muted"
                )}
              />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="text-pawblue-dark opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 pb-4 border-t border-border pt-4">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl mb-2">
            <div className="w-8 h-8 rounded-full bg-pawblue flex items-center justify-center text-xs font-bold text-pawblue-dark flex-shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text truncate">{user.full_name}</p>
              <p className="text-xs text-text-light truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-text-muted hover:bg-red-50 hover:text-red-500 w-full transition-all duration-150"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}