"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Sidebar } from "@/components/shared/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router       = useRouter();
  const token        = useAuthStore((s) => s.token);
  const hasHydrated  = useAuthStore((s) => s._hasHydrated); // ← new

  useEffect(() => {
    if (!hasHydrated) return;          // ← wait, don't judge yet
    if (!token) router.replace("/login");
  }, [token, hasHydrated, router]);

  // Still loading from localStorage — show nothing (no flash, no redirect)
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F8FF]">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-float">🐾</span>
          <p className="text-text-muted text-sm">Loading PawCare…</p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex min-h-screen bg-[#F0F8FF]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}