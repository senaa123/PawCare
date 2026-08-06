/* ── Sidebar.tsx ─────────────────────────────────────────────────────────────
   Fixed 190px forest-green sidebar matching design screenshots 2, 3 & 4.
   Uses vector icons (LayoutGrid, Video, Cat, Camera, Bell, Activity, Zap).
─────────────────────────────────────────────────────────────────────────── */
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutGrid,
  Video,
  Cat,
  Camera,
  Bell,
  Activity,
  Zap,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',       icon: LayoutGrid },
  { to: '/monitoring', label: 'Live monitor',     icon: Video      },
  { to: '/cats',       label: 'My cats',          icon: Cat        },
  { to: '/streams',    label: 'Camera streams',   icon: Camera     },
  { to: '/alerts',     label: 'Alerts',           icon: Bell       },
  { to: '/analytics',  label: 'Analytics',        icon: Activity   },
  { to: '/automation', label: 'Automation',       icon: Zap        },
]

export function Sidebar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const user      = useAuthStore((s) => s.user)
  const logout    = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'S'

  const displayName = user?.full_name
    ? user.full_name.split(' ')[0]
    : 'User'

  return (
    <aside
      className="flex flex-col bg-[#1F3A2E] text-white select-none"
      style={{ width: 190, minWidth: 190, flexShrink: 0 }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-6">
        <div
          className="w-8 h-8 rounded-[9px] bg-[#E8813A] flex items-center justify-center relative flex-shrink-0"
        >
          <div className="absolute top-[5px] right-[5px] w-1.5 h-1.5 rounded-full bg-white/60" />
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="1.6"/><circle cx="16" cy="8" r="1.6"/><circle cx="5.5" cy="13" r="1.4"/><circle cx="18.5" cy="13" r="1.4"/>
            <path d="M12 13c-4 0-6.5 2.4-6.5 5.2 0 2.1 2.3 3.3 6.5 3.3s6.5-1.2 6.5-3.3c0-2.8-2.5-5.2-6.5-5.2Z"/>
          </svg>
        </div>
        <span
          className="text-[#F4EFE3] font-serif font-medium text-[20px] tracking-tight"
          style={{ fontFamily: 'Fraunces, serif' }}
        >
          PawCare
        </span>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex flex-col gap-1 px-2.5 flex-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to))
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-white bg-white/[0.08]'
                  : 'text-white/75 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : 'text-white/75'} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* ── User profile ─────────────────────────────────────────────────── */}
      <div className="mt-auto px-3 pb-4">
        <div className="border-t border-white/10 mb-3" />
        <div className="flex items-center gap-2.5 px-1">
          <div
            className="w-8 h-8 rounded-full bg-[#E8813A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-xs font-semibold truncate">{displayName}</p>
            <button
              onClick={handleLogout}
              className="text-white/50 text-[11px] hover:text-white/80 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
