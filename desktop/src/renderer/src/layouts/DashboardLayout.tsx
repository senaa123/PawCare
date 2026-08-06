/* ── DashboardLayout.tsx ─────────────────────────────────────────────────────
   Cream background, fixed 190px forest-green sidebar, scrollable content area.
   Custom 40px frameless titlebar sits above the two-column layout.
─────────────────────────────────────────────────────────────────────────── */
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Sidebar } from '@/components/shared/Sidebar'

export default function DashboardLayout() {
  const navigate    = useNavigate()
  const token       = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)

  useEffect(() => {
    if (!hasHydrated) return
    if (!token) navigate('/login', { replace: true })
  }, [token, hasHydrated, navigate])

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-pulse-dot">🐾</span>
          <p className="text-ink-muted text-sm font-body">Loading PawCare…</p>
        </div>
      </div>
    )
  }

  if (!token) return null

  return (
    <div className="flex flex-col min-h-screen bg-cream" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Custom titlebar matching login split design */}
      <div
        className="drag-region flex items-center justify-between relative z-20"
        style={{ height: 40, minHeight: 40, flexShrink: 0 }}
      >
        {/* Left sidebar portion matching 190px forest green */}
        <div className="flex items-center px-4 bg-[#1F3A2E] h-full" style={{ width: 190, minWidth: 190 }}>
          <span className="text-white/60 text-xs font-body no-drag">PawCare</span>
        </div>

        {/* Right portion matching warm cream dashboard header */}
        <div className="flex-1 flex items-center justify-end px-4 bg-[#FBF6ED] h-full">
          {/* Dot controls */}
          <div className="no-drag flex items-center gap-2">
            <button
              onClick={() => (window as any).electron?.ipcRenderer?.send('window-minimize')}
              className="w-3 h-3 rounded-full bg-[#E8DFC8] hover:bg-yellow-400 transition-colors"
              aria-label="Minimise"
            />
            <button
              onClick={() => (window as any).electron?.ipcRenderer?.send('window-maximize')}
              className="w-3 h-3 rounded-full bg-[#E8DFC8] hover:bg-green-400 transition-colors"
              aria-label="Maximise"
            />
            <button
              onClick={() => (window as any).electron?.ipcRenderer?.send('window-close')}
              className="w-3 h-3 rounded-full bg-[#E8DFC8] hover:bg-red-400 transition-colors"
              aria-label="Close"
            />
          </div>
        </div>
      </div>


      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-cream">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
