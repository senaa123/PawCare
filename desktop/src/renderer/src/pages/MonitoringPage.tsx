import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Cpu, Eye, EyeOff, Loader2, Video, Trash2 } from 'lucide-react'
import { TopBar }        from '@/components/shared/TopBar'
import { useAuthStore }  from '@/store/authStore'
import { useToast }      from '@/components/ui/Toast'
import { ReconnectingWebSocket } from '@/lib/websocket'

const WS_BASE      = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'
const BACKEND_URL  = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000'
// Edge node streams MJPEG on :8765 by default
const STREAM_URL   = 'http://localhost:8765/video_feed'

interface CameraConfig {
  token:       string
  cameraIndex: number
  enableFace:  boolean
  showPreview: boolean
  device:      string
  backendUrl:  string
}
type CameraStatus = 'running' | 'stopped'

interface WSEvent {
  type:    string
  payload: Record<string, unknown>
}

// ── Event type → visual config ─────────────────────────────────────────────────
const EVENT_META: Record<string, { emoji: string; color: string; label: string }> = {
  cat_detected:       { emoji: '🐱', color: 'bg-blue-50 border-blue-200',    label: 'Cat Detected'      },
  cat_identified:     { emoji: '🔍', color: 'bg-emerald-50 border-emerald-200', label: 'Cat Identified'  },
  behavior_detected:  { emoji: '🎭', color: 'bg-violet-50 border-violet-200', label: 'Behavior'          },
  anomaly_detected:   { emoji: '⚠️',  color: 'bg-amber-50 border-amber-200',  label: 'Anomaly!'          },
  alert_triggered:    { emoji: '🚨', color: 'bg-red-50 border-red-200',       label: 'Alert!'            },
  motion_detected:    { emoji: '💨', color: 'bg-sky-50 border-sky-200',       label: 'Motion'            },
}

function getEventMeta(type: string) {
  return EVENT_META[type] ?? { emoji: '📡', color: 'bg-gray-50 border-gray-200', label: type }
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, starting }: { status: CameraStatus; starting: boolean }) {
  if (starting) return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
      <Loader2 size={11} className="animate-spin" /> Starting…
    </span>
  )
  if (status === 'running') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Stopped
    </span>
  )
}

// ── Camera Feed Panel ─────────────────────────────────────────────────────────
function CameraFeedPanel({ isRunning }: { isRunning: boolean }) {
  const [streamError, setStreamError] = useState(false)

  // Reset error state when camera starts/stops
  useEffect(() => { setStreamError(false) }, [isRunning])

  return (
    <div className="card p-0 overflow-hidden flex flex-col" style={{ minHeight: 340 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
        <Video size={16} className={isRunning ? 'text-emerald-500' : 'text-gray-400'} />
        <span className="font-semibold text-text text-sm">Camera Feed</span>
        {isRunning && !streamError && (
          <span className="ml-auto text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
            Streaming
          </span>
        )}
      </div>

      {/* Feed area */}
      <div className="flex-1 bg-gray-950 flex items-center justify-center relative overflow-hidden" style={{ minHeight: 280 }}>
        {isRunning && !streamError ? (
          /* MJPEG stream — shown immediately, never waits for onLoad (streams never "finish") */
          <img
            src={`${STREAM_URL}`}
            key="mjpeg-stream"
            className="w-full h-full object-contain"
            onError={() => setStreamError(true)}
            alt="Camera feed"
          />
        ) : isRunning && streamError ? (
          <div className="flex flex-col items-center gap-3 text-gray-500 px-8 text-center">
            <CameraOff size={36} className="text-red-400" />
            <p className="text-sm font-medium text-red-400">Stream unavailable</p>
            <p className="text-xs text-gray-500">
              Edge node stream not reachable at <code className="bg-gray-800 px-1 rounded text-gray-300">localhost:8765</code>
            </p>
            <button
              onClick={() => setStreamError(false)}
              className="mt-1 text-xs text-pawblue-dark bg-pawblue-light px-3 py-1.5 rounded-lg hover:bg-pawblue transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-600">
            <CameraOff size={40} className="text-gray-700" />
            <p className="text-sm font-medium text-gray-400">Camera not started</p>
            <p className="text-xs text-gray-600">Start the camera to see the live feed</p>
          </div>
        )}
      </div>
    </div>
  )
}


// ── Detection event card ──────────────────────────────────────────────────────
function EventCard({ ev, timestamp }: { ev: WSEvent; timestamp: Date }) {
  const meta = getEventMeta(ev.type)
  const p    = ev.payload

  return (
    <div className={`border rounded-2xl p-4 ${meta.color} transition-all`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-2xl shrink-0 leading-none mt-0.5">{meta.emoji}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-bold text-gray-800">{meta.label}</span>
            <span className="text-xs text-gray-500 shrink-0">
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Smart field rendering — avoid raw JSON dump */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            {p.cat_name != null && (
              <span>🐱 <strong>{String(p.cat_name)}</strong></span>
            )}
            {p.behavior != null && (
              <span>🎭 {String(p.behavior)}</span>
            )}
            {p.confidence != null && (
              <span>📊 {(Number(p.confidence) * 100).toFixed(1)}% confidence</span>
            )}
            {p.camera_id != null && (
              <span>📷 Camera {String(p.camera_id)}</span>
            )}
            {p.message != null && (
              <span className="italic">{String(p.message)}</span>
            )}
            {/* Fallback: show remaining keys not already shown */}
            {Object.entries(p)
              .filter(([k]) => !['cat_name','behavior','confidence','camera_id','message'].includes(k))
              .map(([k, v]) => (
                <span key={k} className="text-gray-500">
                  {k}: <span className="text-gray-700">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </span>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const { token }  = useAuthStore()
  const { addToast } = useToast()
  const wsRef      = useRef<ReconnectingWebSocket | null>(null)

  const [connected, setConnected] = useState(false)
  const [events,    setEvents]    = useState<{ ev: WSEvent; ts: Date }[]>([])

  // Camera state
  const [status,      setStatus]      = useState<CameraStatus>('stopped')
  const [starting,    setStarting]    = useState(false)
  const [cameraIndex, setCameraIndex] = useState(0)
  const [enableFace,  setEnableFace]  = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [useGpu,      setUseGpu]      = useState(true)

  // WebSocket for live events
  useEffect(() => {
    if (!token) return
    const ws = new ReconnectingWebSocket(`${WS_BASE}/api/v1/dashboard/ws?token=${token}`)
    ws.onOpen    = () => setConnected(true)
    ws.onClose   = () => setConnected(false)
    ws.onMessage = (e) => {
      try {
        const data = JSON.parse(e.data) as WSEvent
        setEvents((prev) => [{ ev: data, ts: new Date() }, ...prev].slice(0, 60))
      } catch { /* ignore */ }
    }
    wsRef.current = ws
    return () => { ws.close(); wsRef.current = null }
  }, [token])

  // Camera IPC
  useEffect(() => {
    window.api?.getCameraStatus().then(setStatus)
    const unsub = window.api?.onCameraStatusChange((s) => {
      if (s === 'running') addToast('Camera AI worker is live!', 'success')
    })
    return () => unsub?.()
  }, [])

  function handleStart() {
    if (!token) { addToast('You must be logged in', 'error'); return }
    setStarting(true)
    window.api?.startCamera({
      token, cameraIndex, enableFace, showPreview,
      device: useGpu ? '0' : 'cpu',
      backendUrl: BACKEND_URL,
    } as CameraConfig)
    setTimeout(() => {
      setStarting((prev) => {
        if (prev) addToast('Camera taking too long — check edge_node logs', 'warning')
        return false
      })
    }, 12_000)
  }

  function handleStop() { window.api?.stopCamera() }

  const isRunning = status === 'running'

  return (

    <div className="p-8 max-w-5xl mx-auto">
      <TopBar
        title="Live monitor"
        subtitle="Real-time detection feed from all active cameras"
        rightElement={
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
            connected ? 'bg-[#EDFBF0] text-[#2F7D51]' : 'bg-[#F0E6D2] text-[#6B6558]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#2F7D51] animate-pulse' : 'bg-[#9B8B72]'}`} />
            {connected ? 'Connected — receiving live events' : 'Connecting…'}
          </div>
        }
      />

      {/* Top row: Control card (left 2/5) + Camera Feed (right 3/5) */}
      <div className="grid grid-cols-5 gap-5 mb-5">
        {/* Camera control card */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-[#E8DFC8] shadow-card p-5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isRunning ? 'bg-[#EDFBF0]' : 'bg-[#F0E6D2]'}`}>
                  {isRunning
                    ? <Camera size={18} className="text-[#2F7D51]" />
                    : <CameraOff size={18} className="text-[#9B8B72]" />}
                </div>
                <div>
                  <p className="font-bold text-[#22201B] text-sm">Built-in webcam AI</p>
                  <p className="text-xs text-[#6B6558]">YOLOv8 · Face recognition · Behavior</p>
                </div>
              </div>
              <StatusBadge status={status} starting={starting} />
            </div>

            {/* Config toggles */}
            <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
              {/* Camera device */}
              <div className="bg-[#F0E6D2] rounded-xl p-3">
                <p className="text-xs text-[#6B6558] mb-1.5 font-medium">Camera device</p>
                <select
                  disabled={isRunning || starting}
                  value={cameraIndex}
                  onChange={(e) => setCameraIndex(Number(e.target.value))}
                  className="w-full text-sm bg-white border border-[#E8DFC8] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1F3A2E] disabled:opacity-50"
                >
                  <option value={0}>Webcam</option>
                  <option value={1}>Webcam #1</option>
                  <option value={2}>Webcam #2</option>
                </select>
              </div>

              {/* Compute device */}
              <div className="bg-[#F0E6D2] rounded-xl p-3">
                <p className="text-xs text-[#6B6558] mb-1.5 font-medium">Compute device</p>
                <button
                  disabled={isRunning || starting}
                  onClick={() => setUseGpu((v) => !v)}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    useGpu ? 'bg-[#1F3A2E] text-white' : 'bg-white text-[#6B6558] border border-[#E8DFC8]'}`}
                >
                  <Cpu size={14} />
                  {useGpu ? 'GPU (CUDA)' : 'CPU Only'}
                </button>
              </div>

              {/* Face recognition toggle */}
              <div
                onClick={() => !isRunning && !starting && setEnableFace((v) => !v)}
                className={`bg-[#F0E6D2] rounded-xl p-3 cursor-pointer select-none transition-colors ${
                  enableFace ? 'ring-2 ring-[#1F3A2E]' : ''
                } ${(isRunning || starting) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#E3D6BC]'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#22201B] font-semibold">Face recognition</p>
                  <div className={`w-8 h-4 rounded-full transition-colors ${enableFace ? 'bg-[#1F3A2E]' : 'bg-[#D6CDB4]'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.5 transition-transform shadow ${enableFace ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </div>
                <p className="text-xs text-[#6B6558] mt-1">
                  {enableFace ? 'Identify enrolled cats' : 'Behavior tracking only'}
                </p>
              </div>

              {/* Debug preview toggle */}
              <div
                onClick={() => !isRunning && !starting && setShowPreview((v) => !v)}
                className={`bg-[#F0E6D2] rounded-xl p-3 cursor-pointer select-none transition-colors ${
                  showPreview ? 'ring-2 ring-[#1F3A2E]' : ''
                } ${(isRunning || starting) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#E3D6BC]'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#22201B] font-semibold">Debug preview</p>
                  {showPreview ? <Eye size={14} className="text-[#1F3A2E]" /> : <EyeOff size={14} className="text-[#9B8B72]" />}
                </div>
                <p className="text-xs text-[#6B6558] mt-1">
                  {showPreview ? 'OpenCV window visible' : 'Run silently in background'}
                </p>
              </div>
            </div>

            {/* Start / Stop */}
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full h-12 bg-[#E8813A] hover:bg-[#C4661F] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 text-[15px]"
              >
                {starting
                  ? <><Loader2 size={16} className="animate-spin" /> Starting Camera AI…</>
                  : <><Camera size={16} /> Start built-in camera</>}
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-[15px]"
              >
                <CameraOff size={16} /> Stop Camera
              </button>
            )}
          </div>
        </div>

        {/* Camera feed panel */}
        <div className="col-span-3">
          <CameraFeedPanel isRunning={isRunning} />
        </div>
      </div>

      {/* Live Detection Events */}
      <div className="bg-white rounded-xl border border-[#E8DFC8] shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0E6D2] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${connected && events.length > 0 ? 'bg-[#2F7D51] animate-pulse' : 'bg-[#D6CDB4]'}`} />
            <h2 className="font-semibold text-[#22201B] text-sm">Live detection events</h2>
            {events.length > 0 && (
              <span className="text-xs text-white bg-[#1F3A2E] px-2 py-0.5 rounded-full">
                {events.length}
              </span>
            )}
          </div>
          {events.length > 0 && (
            <button
              onClick={() => setEvents([])}
              className="flex items-center gap-1.5 text-xs text-[#6B6558] hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>

        <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: '38vh' }}>
          {events.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-4xl block mb-3">📡</span>
              <p className="font-semibold text-[#22201B] text-sm mb-1" style={{ fontFamily: 'Fraunces, serif' }}>
                {connected ? 'No events yet' : 'Connecting…'}
              </p>
              <p className="text-xs text-[#6B6558]">
                {connected ? 'Start the camera to begin live detection' : 'Establishing WebSocket connection…'}
              </p>
            </div>
          ) : (
            events.map(({ ev, ts }, i) => (
              <EventCard key={i} ev={ev} timestamp={ts} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

