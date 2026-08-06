import { useEffect, useState } from 'react'
import { Camera, CameraOff, Cpu, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useToast }     from '@/components/ui/Toast'

// Mirrors the types defined in preload/index.d.ts
interface CameraConfig {
  token:       string
  cameraIndex: number
  enableFace:  boolean
  showPreview: boolean
  device:      string
  backendUrl:  string
}
type CameraStatus = 'running' | 'stopped'

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000'

// ── Status badge ─────────────────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
export default function CameraControlCard() {
  const { token } = useAuthStore()
  const { addToast } = useToast()

  // Camera status synced from Electron IPC
  const [status,   setStatus]   = useState<CameraStatus>('stopped')
  const [starting, setStarting] = useState(false)

  // Config controls
  const [cameraIndex,  setCameraIndex]  = useState(0)
  const [enableFace,   setEnableFace]   = useState(true)
  const [showPreview,  setShowPreview]  = useState(false)
  const [useGpu,       setUseGpu]       = useState(true)

  // ── Sync initial status + subscribe to live changes ───────────────────────
  useEffect(() => {
    // Get current status on mount
    window.api?.getCameraStatus().then(setStatus)

    // Subscribe to status change events broadcast from Electron main
    const unsub = window.api?.onCameraStatusChange((s) => {
      setStatus(s)
      setStarting(false)
      if (s === 'stopped') addToast('Camera AI worker stopped', 'info')
      if (s === 'running') addToast('Camera AI worker is live!', 'success')
    })

    return () => unsub?.()
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleStart() {
    if (!token) { addToast('You must be logged in to start the camera', 'error'); return }
    setStarting(true)

    const config: CameraConfig = {
      token,
      cameraIndex,
      enableFace,
      showPreview,
      device:     useGpu ? '0' : 'cpu',
      backendUrl: BACKEND_URL,
    }
    window.api?.startCamera(config)

    // If status hasn't changed after 12 s, assume startup failure
    setTimeout(() => {
      setStarting((prev) => {
        if (prev) addToast('Camera taking too long — check edge_node logs', 'warning')
        return false
      })
    }, 12_000)
  }

  function handleStop() {
    window.api?.stopCamera()
  }

  const isRunning = status === 'running'

  return (
    <div className="card border border-pawblue/30">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isRunning ? 'bg-emerald-50' : 'bg-gray-50'}`}>
            {isRunning
              ? <Camera size={20} className="text-emerald-500" />
              : <CameraOff size={20} className="text-gray-400" />}
          </div>
          <div>
            <p className="font-bold text-text text-sm">Built-in Webcam AI</p>
            <p className="text-xs text-text-muted">YOLOv8 · Face Recognition · Behavior Analysis</p>
          </div>
        </div>
        <StatusBadge status={status} starting={starting} />
      </div>

      {/* ── Config toggles (disabled while running) ────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">

        {/* Camera index */}
        <div className="bg-muted rounded-2xl p-3">
          <p className="text-xs text-text-muted mb-1.5 font-medium">Camera Device</p>
          <select
            disabled={isRunning || starting}
            value={cameraIndex}
            onChange={(e) => setCameraIndex(Number(e.target.value))}
            className="w-full text-sm bg-white border border-border rounded-xl px-3 py-1.5
                       focus:outline-none focus:ring-2 focus:ring-pawblue disabled:opacity-50"
          >
            <option value={0}>Webcam #0 (default)</option>
            <option value={1}>Webcam #1</option>
            <option value={2}>Webcam #2</option>
          </select>
        </div>

        {/* GPU vs CPU */}
        <div className="bg-muted rounded-2xl p-3">
          <p className="text-xs text-text-muted mb-1.5 font-medium">Compute Device</p>
          <button
            disabled={isRunning || starting}
            onClick={() => setUseGpu((v) => !v)}
            className={`w-full flex items-center justify-center gap-2 text-sm font-medium
                        py-1.5 rounded-xl transition-colors disabled:opacity-50
                        ${useGpu
                          ? 'bg-pawblue-dark text-white'
                          : 'bg-white text-text-muted border border-border'}`}
          >
            <Cpu size={14} />
            {useGpu ? 'GPU (CUDA)' : 'CPU Only'}
          </button>
        </div>

        {/* Face recognition toggle */}
        <div
          onClick={() => !isRunning && !starting && setEnableFace((v) => !v)}
          className={`bg-muted rounded-2xl p-3 cursor-pointer select-none transition-colors
                      ${enableFace ? 'ring-2 ring-pawblue' : ''}
                      ${(isRunning || starting) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pawblue-light'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted font-medium">Face Recognition</p>
            <div className={`w-8 h-4 rounded-full transition-colors ${enableFace ? 'bg-pawblue-dark' : 'bg-gray-300'}`}>
              <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.5 transition-transform shadow
                              ${enableFace ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </div>
          <p className="text-xs text-text-light mt-1">
            {enableFace ? 'Identify enrolled cats by face' : 'Behavior tracking only'}
          </p>
        </div>

        {/* OpenCV preview toggle */}
        <div
          onClick={() => !isRunning && !starting && setShowPreview((v) => !v)}
          className={`bg-muted rounded-2xl p-3 cursor-pointer select-none transition-colors
                      ${showPreview ? 'ring-2 ring-pawblue' : ''}
                      ${(isRunning || starting) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pawblue-light'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted font-medium">Debug Preview</p>
            {showPreview ? <Eye size={14} className="text-pawblue-dark" /> : <EyeOff size={14} className="text-gray-400" />}
          </div>
          <p className="text-xs text-text-light mt-1">
            {showPreview ? 'OpenCV window visible' : 'Run silently in background'}
          </p>
        </div>
      </div>

      {/* ── Start / Stop button ────────────────────────────────────────────── */}
      {!isRunning ? (
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3"
        >
          {starting
            ? <><Loader2 size={16} className="animate-spin" /> Starting Camera AI…</>
            : <><Camera size={16} /> Start Built-in Camera</>
          }
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold
                     py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <CameraOff size={16} /> Stop Camera
        </button>
      )}
    </div>
  )
}
