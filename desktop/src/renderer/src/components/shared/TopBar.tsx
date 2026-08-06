/* ── TopBar.tsx ─────────────────────────────────────────────────────────────
   Shared header for all authenticated pages matching screenshots 2, 3 & 4.
   Renders Fraunces page title + subtitle on the left, and optional rightElement
   + top-right notification bell icon button across ALL pages.
─────────────────────────────────────────────────────────────────────────── */
import { ReactNode }   from 'react'
import { useNavigate }  from 'react-router-dom'
import { Bell }         from 'lucide-react'

interface TopBarProps {
  title:         string
  subtitle?:      string
  rightElement?: ReactNode
}

export function TopBar({ title, subtitle, rightElement }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-start justify-between mb-8 animate-in" style={{ opacity: 0 }}>
      <div>
        <h1
          className="text-[#22201B] font-serif font-medium text-[28px] leading-tight"
          style={{ fontFamily: 'Fraunces, serif' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-[#6B6558] text-sm mt-1">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {rightElement}
        <button
          onClick={() => navigate('/alerts')}
          className="w-10 h-10 rounded-xl border border-[#E8DFC8] bg-white hover:bg-[#F0E6D2] transition-colors flex items-center justify-center text-[#6B6558] hover:text-[#22201B] shadow-sm cursor-pointer flex-shrink-0"
          title="Alerts"
        >
          <Bell size={18} />
        </button>
      </div>
    </div>
  )
}
