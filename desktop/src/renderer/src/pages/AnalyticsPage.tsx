/* ── AnalyticsPage.tsx ───────────────────────────────────────────────────────
   Analytics with pure SVG charts (no recharts dependency needed).
   Line chart draws via stroke-dasharray animation.
   Bar chart bars grow from 0 height on mount.
─────────────────────────────────────────────────────────────────────────── */
import { useQuery }       from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api }            from '@/lib/api'

interface DailyDetection { date: string; count: number }
interface BehaviorItem   { activity: string; seconds: number }

const MOCK_DAILY: DailyDetection[] = [
  { date: '07-30', count: 0  },
  { date: '07-31', count: 0  },
  { date: '08-01', count: 1  },
  { date: '08-02', count: 3  },
  { date: '08-03', count: 232},
  { date: '08-04', count: 80 },
  { date: '08-05', count: 43 },
]
const MOCK_BEHAVIORS: { activity: string; minutes: number }[] = [
  { activity: 'Sleeping', minutes: 240 },
  { activity: 'Eating',   minutes: 45  },
  { activity: 'Playing',  minutes: 30  },
]

const fetchAnalytics = async () => {
  try {
    const [daily, behaviors] = await Promise.all([
      api.get<DailyDetection[]>('/analytics/detections/daily').then((r) => r.data).catch(() => []),
      api.get<BehaviorItem[]>('/analytics/behaviors').then((r) => r.data).catch(() => []),
    ])
    const total = Array.isArray(daily) ? daily.reduce((a, d) => a + (d.count || 0), 0) : 0
    return {
      total,
      daily:     Array.isArray(daily) && daily.length > 0 ? daily : MOCK_DAILY,
      behaviors: Array.isArray(behaviors) && behaviors.length > 0
        ? behaviors.map((b) => ({ activity: b.activity, minutes: Math.round(b.seconds / 60) }))
        : MOCK_BEHAVIORS,
    }
  } catch { return null }
}

/* Count-up hook */
function useCountUp(target: number, duration = 500) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(0); return }
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      setVal(Math.round(p * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return val
}

/* Inline SVG line chart */
function LineChartSVG({ data }: { data: DailyDetection[] }) {
  const W = 680, H = 180, PAD = { t: 16, r: 16, b: 32, l: 40 }
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b
  const maxVal = Math.max(...data.map((d) => d.count), 1)
  const pts = data.map((d, i) => ({
    x: PAD.l + (i / (data.length - 1)) * iW,
    y: PAD.t + iH - (d.count / maxVal) * iH,
    ...d,
  }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const pathLen = pts.reduce((acc, p, i) => {
    if (i === 0) return 0
    const pp = pts[i - 1]
    return acc + Math.hypot(p.x - pp.x, p.y - pp.y)
  }, 0)

  const [drawn, setDrawn] = useState(false)
  useEffect(() => { setTimeout(() => setDrawn(true), 100) }, [])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = PAD.t + iH * (1 - f)
        return (
          <g key={f}>
            <line x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y} stroke="#E8DFC8" strokeDasharray="4 4" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9C9589">
              {Math.round(maxVal * f)}
            </text>
          </g>
        )
      })}

      {/* Axis labels */}
      {pts.map((p) => (
        <text key={p.date} x={p.x} y={H - 6} textAnchor="middle" fontSize={10} fill="#9C9589">
          {p.date}
        </text>
      ))}

      {/* Animated line */}
      <path
        d={pathD}
        fill="none"
        stroke="#E8813A"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLen}
        strokeDashoffset={drawn ? 0 : pathLen}
        style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
      />

      {/* Data points */}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#E8813A"
          stroke="#FBF6ED"
          strokeWidth={2}
          style={{ opacity: drawn ? 1 : 0, transition: `opacity 200ms ${100 + i * 60}ms ease-out` }}
        />
      ))}
    </svg>
  )
}

/* Inline SVG bar chart */
function BarChartSVG({ data }: { data: { activity: string; minutes: number }[] }) {
  const W = 680, H = 200, PAD = { t: 16, r: 16, b: 36, l: 40 }
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b
  const maxVal = Math.max(...data.map((d) => d.minutes), 1)
  const barW   = iW / data.length * 0.45
  const gap    = iW / data.length

  const [animated, setAnimated] = useState(false)
  useEffect(() => { setTimeout(() => setAnimated(true), 120) }, [])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {[0, 0.5, 1].map((f) => {
        const y = PAD.t + iH * (1 - f)
        return (
          <g key={f}>
            <line x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y} stroke="#E8DFC8" strokeDasharray="4 4" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9C9589">
              {Math.round(maxVal * f)}
            </text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const barH = animated ? (d.minutes / maxVal) * iH : 0
        const x    = PAD.l + gap * i + (gap - barW) / 2
        const y    = PAD.t + iH - barH
        const fill = i === 0 ? '#E8813A' : '#F5C8A1'
        return (
          <g key={d.activity}>
            <rect
              x={x} y={y} width={barW} height={barH}
              rx={4} fill={fill}
              style={{ transition: `height 450ms ${60 * i}ms ease-out, y 450ms ${60 * i}ms ease-out` }}
            />
            <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize={11} fill="#6B665E">
              {d.activity}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn:  fetchAnalytics,
  })

  const total     = useCountUp(data?.total ?? 0)
  const behaviors = data?.behaviors ?? MOCK_BEHAVIORS
  const daily     = data?.daily ?? MOCK_DAILY
  const anomalies = 0
  const alertsW   = 0

  const STATS = [
    { label: 'Detections this week', value: total },
    { label: 'Active behaviors',     value: behaviors.length },
    { label: 'Anomalies detected',   value: anomalies },
    { label: 'Alerts this week',     value: alertsW },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-in" style={{ opacity: 0 }}>
        <h1 style={{ fontSize: 28, fontFamily: 'Fraunces, serif', fontWeight: 600 }} className="text-ink">
          Analytics
        </h1>
        <p className="text-ink-muted text-sm mt-1">Behaviour trends and health insights</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-[#E8DFC8] shadow-card p-5 animate-in"
            style={{ animationDelay: `${i * 60}ms`, opacity: 0 }}
          >
            <p className="text-ink-muted text-xs mb-2">{s.label}</p>
            <p className="text-ink font-bold" style={{ fontSize: 22 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div
        className="bg-white rounded-xl border border-[#E8DFC8] shadow-card p-6 mb-4 animate-in"
        style={{ animationDelay: '300ms', opacity: 0 }}
      >
        <h2 className="text-ink mb-5" style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600 }}>
          Detection events — last 7 days
        </h2>
        {isLoading ? (
          <div className="h-44 bg-oat/60 animate-pulse rounded-xl" />
        ) : (
          <LineChartSVG data={daily} />
        )}
      </div>

      {/* Bar chart */}
      <div
        className="bg-white rounded-xl border border-[#E8DFC8] shadow-card p-6 animate-in"
        style={{ animationDelay: '380ms', opacity: 0 }}
      >
        <h2 className="text-ink mb-5" style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600 }}>
          Tracked behavior duration (minutes)
        </h2>
        {isLoading ? (
          <div className="h-48 bg-oat/60 animate-pulse rounded-xl" />
        ) : (
          <BarChartSVG data={behaviors} />
        )}
      </div>
    </div>
  )
}
