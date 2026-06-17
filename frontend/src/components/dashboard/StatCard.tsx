"use client";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title:      string;
  value:      string | number;
  icon:       LucideIcon;
  iconColor?: string;
  iconBg?:    string;
  trend?:     string;
  trendUp?:   boolean;
  loading?:   boolean;
}

export default function StatCard({
  title, value, icon: Icon,
  iconColor = "text-pawblue-dark",
  iconBg    = "bg-pawblue-light",
  trend, trendUp, loading,
}: StatCardProps) {
  return (
    <div className="card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted font-medium">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 bg-border animate-pulse rounded-xl" />
          ) : (
            <p className="mt-1 font-display text-3xl font-bold text-text">{value}</p>
          )}
          {trend && (
            <p className={cn("text-xs mt-1 font-medium", trendUp ? "text-green-500" : "text-red-400")}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-2xl", iconBg)}>
          <Icon size={22} className={iconColor} />
        </div>
      </div>
    </div>
  );
}