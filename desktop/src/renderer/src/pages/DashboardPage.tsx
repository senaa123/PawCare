/* ── DashboardPage.tsx ───────────────────────────────────────────────────────
   Main dashboard matching screenshot 2.
   Cream background, stat cards, quick actions, cats panel.
─────────────────────────────────────────────────────────────────────────── */
import { useEffect, useState } from 'react'
import { useQuery }           from '@tanstack/react-query'
import { Link }               from 'react-router-dom'
import { catsApi, streamsApi }from '@/lib/api'
import { useAuthStore }       from '@/store/authStore'
import { TopBar }             from '@/components/shared/TopBar'
import {
  Camera,
  Cat,
  Activity,
  Bell,
  Video,
  Plus,
} from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function useCountUp(target: number, duration = 500) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    const start = performance.now()
    const tick  = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setVal(Math.round(p * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return val
}

function StatCard({
  label, value, icon: Icon, chipBg, iconColor, delay = 0,
}: {
  label: string; value: number | string; icon: any; chipBg: string; iconColor: string; delay?: number
}) {
  const num     = typeof value === 'number' ? value : 0
  const counted = useCountUp(num)
  return (
    <div
      className="bg-white rounded-xl border border-[#E8DFC8] shadow-card p-5 animate-in hover:-translate-y-0.5 hover:shadow-cardHover transition-all duration-150 text-left"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: chipBg }}
      >
        <Icon size={18} className={iconColor} />
      </div>
      <p className="text-[#6B6558] text-xs mb-1 font-medium">{label}</p>
      <p className="text-[#22201B] font-bold text-[22px]">
        {typeof value === 'number' ? counted : value}
      </p>
    </div>
  )
}

function QuickAction({
  to, icon: Icon, chipBg, iconColor, title, sub, primary = false, delay = 0,
}: {
  to: string; icon: any; chipBg: string; iconColor: string; title: string; sub: string; primary?: boolean; delay?: number
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-4 rounded-xl border p-5 animate-in hover:-translate-y-0.5 transition-all duration-150 text-left ${
        primary
          ? 'bg-[#1F3A2E] border-transparent hover:shadow-cardHover'
          : 'bg-white border-[#E8DFC8] hover:shadow-card'
      }`}
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: chipBg }}
      >
        <Icon size={20} className={iconColor} />
      </div>
      <div>
        <p className={`font-semibold text-sm ${primary ? 'text-white' : 'text-[#22201B]'}`}>{title}</p>
        <p className={`text-xs mt-0.5 ${primary ? 'text-white/60' : 'text-[#6B6558]'}`}>{sub}</p>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: cats,    isLoading: catsLoading    } = useQuery({
    queryKey: ['cats'],
    queryFn:  () => catsApi.list().then((r) => r.data),
  })
  const { data: streams, isLoading: streamsLoading } = useQuery({
    queryKey: ['streams'],
    queryFn:  () => streamsApi.list().then((r) => r.data),
  })

  const activeCams = streams?.filter((s: any) => s.is_active).length ?? 0
  const totalCats  = cats?.length ?? 0
  const firstName  = user?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <TopBar
        title={`${getGreeting()}, ${firstName}`}
        subtitle="Here's what's happening with your cats today"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active cameras"   value={activeCams} icon={Camera}   chipBg="#EBF4FF" iconColor="text-[#2B6CB0]" delay={0}   />
        <StatCard label="My cats"          value={totalCats}  icon={Cat}      chipBg="#FFF0F5" iconColor="text-[#D53F8C]" delay={60}  />
        <StatCard label="Detections today" value="—"          icon={Activity} chipBg="#EDFBF0" iconColor="text-[#2F855A]" delay={120} />
        <StatCard label="Active alerts"    value="—"          icon={Bell}     chipBg="#FEF6EC" iconColor="text-[#DD6B20]" delay={180} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <QuickAction to="/monitoring" icon={Video}  chipBg="rgba(255,255,255,0.12)" iconColor="text-white"     title="Open live monitor"  sub="Watch real-time feeds"   primary delay={240} />
        <QuickAction to="/cats"       icon={Cat}    chipBg="#FEF6EC"               iconColor="text-[#E8813A]" title="Add a new cat"      sub="Register a cat profile"  delay={300} />
        <QuickAction to="/streams"    icon={Camera} chipBg="#FEF6EC"               iconColor="text-[#E8813A]" title="Add a camera"       sub="Connect a new stream"    delay={360} />
      </div>

      {/* Your cats panel */}
      <div
        className="bg-white rounded-xl border border-[#E8DFC8] shadow-card p-6 animate-in"
        style={{ animationDelay: '420ms', opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[#22201B] font-serif font-medium text-[18px]" style={{ fontFamily: 'Fraunces, serif' }}>
            Your cats
          </h2>
          <Link to="/cats" className="text-[#E8813A] text-sm font-semibold hover:underline">
            View all →
          </Link>
        </div>

        {catsLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-[#F0E6D2]/60 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : cats && cats.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {cats.slice(0, 6).map((cat: any) => (
              <Link
                key={cat.id}
                to="/cats"
                className="flex items-center gap-3 bg.f0e6d2/40 bg-[#FBF6ED] rounded-xl p-3 hover:bg-[#F0E6D2] transition-colors hover:-translate-y-0.5 duration-150 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#E8813A]/20 flex items-center justify-center text-xl flex-shrink-0">
                  🐱
                </div>
                <div className="min-w-0">
                  <p className="text-[#22201B] text-sm font-semibold truncate">{cat.name}</p>
                  <p className="text-[#6B6558] text-xs truncate">{cat.breed ?? 'Unknown breed'}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 gap-3">
            <span className="text-4xl">🐱</span>
            <p className="text-[#6B6558] text-sm">No cats registered yet</p>
            <Link to="/cats" className="btn-primary text-sm">
              <Plus size={16} /> Add your first cat
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
