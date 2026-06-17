"use client";
import { useQuery } from "@tanstack/react-query";
import { Camera, Cat, Bell, Activity, Video, Plus } from "lucide-react";
import Link from "next/link";
import TopBar    from "@/components/shared/TopBar";
import StatCard  from "@/components/dashboard/StatCard";
import { catsApi, streamsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: cats,    isLoading: catsLoading }    = useQuery({
    queryKey: ["cats"],
    queryFn: () => catsApi.list().then((r) => r.data),
  });

  const { data: streams, isLoading: streamsLoading } = useQuery({
    queryKey: ["streams"],
    queryFn: () => streamsApi.list().then((r) => r.data),
  });

  const activeCams = streams?.filter((s) => s.is_active).length ?? 0;
  const totalCats  = cats?.length ?? 0;

  return (
    <>
      <TopBar
        title={`${getGreeting()}${user ? `, ${user.full_name.split(" ")[0]}` : ""}! 🐾`}
        subtitle="Here's what's happening with your cats today."
      />

      <main className="flex-1 p-6 space-y-6">

        {/* ── Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Active Cameras"
            value={activeCams}
            icon={Camera}
            loading={streamsLoading}
            iconBg="bg-blue-50"
            iconColor="text-blue-400"
          />
          <StatCard
            title="My Cats"
            value={totalCats}
            icon={Cat}
            loading={catsLoading}
            iconBg="bg-pink-50"
            iconColor="text-pink-400"
          />
          <StatCard
            title="Detections Today"
            value="—"
            icon={Activity}
            iconBg="bg-green-50"
            iconColor="text-green-400"
          />
          <StatCard
            title="Active Alerts"
            value="—"
            icon={Bell}
            iconBg="bg-amber-50"
            iconColor="text-amber-400"
          />
        </div>

        {/* ── Quick actions ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: "/monitoring", icon: Video,  label: "Open Live Monitor", sub: "Watch real-time feeds", color: "bg-blue-50 text-blue-500" },
            { href: "/cats",       icon: Cat,    label: "Add a New Cat",     sub: "Register a cat profile",  color: "bg-pink-50 text-pink-500" },
            { href: "/streams",    icon: Camera, label: "Add a Camera",      sub: "Connect a new stream",    color: "bg-violet-50 text-violet-500" },
          ].map((q) => (
            <Link key={q.href} href={q.href} className="card-hover flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${q.color}`}>
                <q.icon size={22} />
              </div>
              <div>
                <p className="font-semibold text-text text-sm">{q.label}</p>
                <p className="text-text-light text-xs mt-0.5">{q.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Cat previews ──────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-text text-lg">Your Cats</h2>
            <Link href="/cats" className="text-sm text-pawblue-dark font-semibold hover:underline">
              View all →
            </Link>
          </div>
          {catsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : cats && cats.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {cats.slice(0, 4).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/cats/${cat.id}`}
                  className="bg-muted rounded-2xl p-4 text-center hover:bg-pawblue-light transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-pawblue mx-auto flex items-center justify-center text-lg font-bold text-pawblue-dark">
                    {cat.name.charAt(0)}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-text truncate">{cat.name}</p>
                  <p className="text-xs text-text-muted">{cat.breed ?? "Unknown breed"}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <span className="text-5xl">🐱</span>
              <p className="mt-3 text-text-muted">No cats yet.</p>
              <Link href="/cats" className="mt-3 inline-flex items-center gap-1.5 btn-primary text-sm">
                <Plus size={16} /> Add your first cat
              </Link>
            </div>
          )}
        </div>

      </main>
    </>
  );
}