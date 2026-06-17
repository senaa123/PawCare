"use client";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications bell */}
          <button className="relative p-2 rounded-2xl hover:bg-pawblue-light transition-colors">
            <Bell size={20} className="text-text-muted" />
            {/* Unread dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full" />
          </button>

          {/* Avatar */}
          {user && (
            <div className="w-9 h-9 rounded-full bg-pawblue flex items-center justify-center text-sm font-bold text-pawblue-dark cursor-pointer">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}