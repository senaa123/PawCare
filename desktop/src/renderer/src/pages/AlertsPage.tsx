/* ── AlertsPage.tsx ──────────────────────────────────────────────────────────
   Stacked alert rows. Unread: white + 3px colored left bar.
   Read: oat background, muted left bar, "Read ✓" static text.
   "Mark all read" cascades with 40ms stagger.
─────────────────────────────────────────────────────────────────────────── */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState }                               from 'react'
import { useAuthStore }                           from '@/store/authStore'

const API = 'http://localhost:8000'

type Alert = {
  id:         string
  title:      string
  message:    string
  severity:   'high' | 'medium' | 'low' | 'info'
  is_read:    boolean
  created_at: string
}

const SEVERITY: Record<string, { chip: string; label: string; bar: string }> = {
  high:   { chip: '#FEE2E2', label: '#B91C1C', bar: '#EF4444' },
  medium: { chip: '#FEF3C7', label: '#B45309', bar: '#F59E0B' },
  low:    { chip: '#E0F2FE', label: '#0369A1', bar: '#38BDF8' },
  info:   { chip: '#E0F2FE', label: '#0369A1', bar: '#38BDF8' },
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export default function AlertsPage() {
  const token       = useAuthStore((s) => s.token)
  const queryClient = useQueryClient()
  const [readSet,   setReadSet] = useState<Set<string>>(new Set())

  const headers = { Authorization: `Bearer ${token}` }

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn:  () =>
      fetch(`${API}/api/v1/alerts?limit=50`, { headers })
        .then((r) => r.json()),
  })

  const markOne = (id: string) => {
    fetch(`${API}/api/v1/alerts/${id}/read`, { method: 'PATCH', headers })
      .then(() => queryClient.invalidateQueries({ queryKey: ['alerts'] }))
    setReadSet((p) => new Set(p).add(id))
  }

  const markAll = () => {
    alerts.filter((a) => !a.is_read).forEach((a, i) => {
      setTimeout(() => markOne(a.id), i * 40)
    })
  }

  const unreadCount = alerts.filter((a) => !a.is_read && !readSet.has(a.id)).length

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 animate-in" style={{ opacity: 0 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: 'Fraunces, serif', fontWeight: 600 }} className="text-ink">
            Alerts
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAll}
            className="flex items-center gap-2 text-sm font-medium text-[#1F3A2E] hover:text-marmalade transition-colors"
          >
            <span>✓</span> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-[#E8DFC8] animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8DFC8] p-16 flex flex-col items-center gap-3">
          <span className="text-4xl">📡</span>
          <p className="text-ink font-semibold" style={{ fontFamily: 'Fraunces, serif', fontSize: 18 }}>No alerts yet</p>
          <p className="text-ink-muted text-sm text-center max-w-xs">
            Alerts appear here when PawCare detects events that need your attention.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((alert, i) => {
            const isRead    = alert.is_read || readSet.has(alert.id)
            const sev       = SEVERITY[alert.severity] ?? SEVERITY.info
            return (
              <div
                key={alert.id}
                className="relative rounded-xl overflow-hidden border animate-in transition-all duration-250"
                style={{
                  background:       isRead ? '#F8F3E8' : '#FFFFFF',
                  borderColor:      isRead ? '#E4D4B5' : '#E8DFC8',
                  animationDelay:   `${i * 30}ms`,
                  opacity:          0,
                }}
              >
                {/* 3px left bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-colors duration-250"
                  style={{ background: isRead ? '#D6CDB4' : sev.bar }}
                />

                <div className="flex items-center gap-4 px-5 pl-6 py-4">
                  {/* Icon chip */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-250"
                    style={{ background: isRead ? '#EDE6D3' : sev.chip }}
                  >
                    <span style={{ fontSize: 16 }}>
                      {alert.severity === 'high' ? '🚨' : alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-semibold truncate ${isRead ? 'text-ink-muted' : 'text-ink'}`}>
                        {alert.title}
                      </p>
                      {!isRead && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: sev.chip, color: sev.label }}
                        >
                          {alert.severity}
                        </span>
                      )}
                    </div>
                    <p className="text-ink-muted text-xs truncate">{timeAgo(alert.created_at)}</p>
                  </div>

                  {/* Action */}
                  {isRead ? (
                    <span className="text-ink-light text-xs flex items-center gap-1 flex-shrink-0">✓ Read</span>
                  ) : (
                    <button
                      onClick={() => markOne(alert.id)}
                      className="text-xs text-marmalade font-medium hover:text-marmalade-hover transition-colors flex-shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
