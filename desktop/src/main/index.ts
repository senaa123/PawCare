import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  Notification,
  shell,
} from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'

// ── App state ──────────────────────────────────────────────────────────────────
let mainWindow:  BrowserWindow  | null = null
let tray:        Tray           | null = null
let backendProc: ChildProcess   | null = null
let cameraProc:  ChildProcess   | null = null

const isDev = !app.isPackaged

// ─────────────────────────────────────────────────────────────────────────────
// Python executable resolvers
// ─────────────────────────────────────────────────────────────────────────────

/** Resolves the Backend venv python — the one that has uvicorn/fastapi/sqlalchemy */
function getBackendPython(backendDir: string): string {
  const isWin = process.platform === 'win32'

  const venv = isWin
    ? join(backendDir, 'venv', 'Scripts', 'python.exe')
    : join(backendDir, 'venv', 'bin', 'python')
  if (existsSync(venv)) return venv

  const tfVenv = isWin
    ? join(backendDir, '..', '.tf_venv', 'Scripts', 'python.exe')
    : join(backendDir, '..', '.tf_venv', 'bin', 'python')
  if (existsSync(tfVenv)) return tfVenv

  return isWin ? 'python' : 'python3'
}

/**
 * Resolves the edge_node venv python — the one that has
 * PyTorch, CUDA, YOLOv8, OpenCV, ArcFace, etc.
 * Priority: ../edge_node/venv → system python
 */
function getEdgePython(rootDir: string): string {
  const isWin = process.platform === 'win32'

  // User-specified location: <project_root>/edge_node/venv
  const edgeVenv = isWin
    ? join(rootDir, 'edge_node', 'venv', 'Scripts', 'python.exe')
    : join(rootDir, 'edge_node', 'venv', 'bin', 'python')
  if (existsSync(edgeVenv)) return edgeVenv

  return isWin ? 'python' : 'python3'
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend subprocess (FastAPI / Uvicorn)
// ─────────────────────────────────────────────────────────────────────────────

function startBackend(): void {
  const backendDir = isDev
    ? join(__dirname, '..', '..', '..', 'Backend')
    : join(process.resourcesPath, 'Backend')

  const pythonExe = getBackendPython(backendDir)
  console.log(`[PawCare] Using Python (backend): ${pythonExe}`)

  backendProc = spawn(
    pythonExe,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
    {
      cwd: backendDir,
      env: { ...process.env },
      stdio: isDev ? 'inherit' : 'ignore',
    }
  )

  backendProc.on('error', (err) =>
    console.error('[PawCare] Backend failed to start:', err.message)
  )
  backendProc.on('close', (code) => {
    console.log(`[PawCare] Backend exited (code ${code})`)
    backendProc = null
  })

  console.log('[PawCare] Backend starting on http://127.0.0.1:8000')
}

function stopBackend(): void {
  if (backendProc) { backendProc.kill(); backendProc = null }
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera AI subprocess (edge_node / YOLOv8 / PyTorch)
// ─────────────────────────────────────────────────────────────────────────────

export interface CameraConfig {
  token:       string   // JWT from logged-in user — avoids storing password
  cameraIndex: number   // 0 = first webcam, 1 = second, etc.
  enableFace:  boolean  // Enable ArcFace cat identity matching
  showPreview: boolean  // Pop-up OpenCV debug window
  device:      string   // '0' = GPU (CUDA), 'cpu' = CPU-only
  backendUrl:  string   // FastAPI base URL
}

function getCameraStatus(): 'running' | 'stopped' {
  return cameraProc !== null ? 'running' : 'stopped'
}

function broadcastCameraStatus(): void {
  const status = getCameraStatus()
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send('camera-status-changed', status)
  )
}

function startCamera(config: CameraConfig): void {
  if (cameraProc) {
    console.log('[PawCare] Camera already running — stop it first')
    return
  }

  const rootDir = isDev
    ? join(__dirname, '..', '..', '..')
    : process.resourcesPath

  const edgeDir = isDev
    ? join(rootDir, 'edge_node')
    : join(process.resourcesPath, 'edge_node')

  const pythonExe = getEdgePython(rootDir)
  console.log(`[PawCare] Using Python (edge): ${pythonExe}`)

  const args = [
    'main_camera.py',
    '--backend',    config.backendUrl,
    '--camera',     String(config.cameraIndex),
    '--device',     config.device,
    '--token',      config.token,
  ]
  if (config.enableFace)  args.push('--enable-face')
  if (config.showPreview) args.push('--show')

  cameraProc = spawn(pythonExe, args, {
    cwd:   edgeDir,
    env:   { ...process.env },
    stdio: isDev ? 'inherit' : 'ignore',
  })

  cameraProc.on('error', (err) => {
    console.error('[PawCare] Camera worker failed to start:', err.message)
    cameraProc = null
    broadcastCameraStatus()
    new Notification({
      title: 'PawCare Camera Error',
      body:  `Failed to start camera: ${err.message}`,
    }).show()
  })

  cameraProc.on('close', (code) => {
    console.log(`[PawCare] Camera worker exited (code ${code})`)
    cameraProc = null
    broadcastCameraStatus()
  })

  console.log('[PawCare] Camera AI worker starting…')
  broadcastCameraStatus()
}

function stopCamera(): void {
  if (cameraProc) {
    cameraProc.kill()
    cameraProc = null
    broadcastCameraStatus()
    console.log('[PawCare] Camera AI worker stopped')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main window
// ─────────────────────────────────────────────────────────────────────────────

function createWindow(): void {
  // Remove native default menu bar (File Edit View Window Help)
  Menu.setApplicationMenu(null)

  mainWindow = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        900,
    minHeight:       600,
    title:           'PawCare',
    backgroundColor: '#FFFFFF',
    titleBarStyle:   'hidden',
    titleBarOverlay: {
      color:       '#FFFFFF',
      symbolColor: '#1E293B',
      height:      38,
    },
    webPreferences: {
      preload:          join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
      webSecurity:      false,   // allow MJPEG stream from edge node (localhost:8765)
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// System Tray
// ─────────────────────────────────────────────────────────────────────────────

function createTray(): void {
  const iconPath = isDev
    ? join(__dirname, '..', '..', '..', 'resources', 'tray-icon.png')
    : join(process.resourcesPath, 'tray-icon.png')

  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('PawCare – Cat Monitoring')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open PawCare', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Stop Camera',  click: () => stopCamera(), enabled: true },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit() } },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────────────────────────────────────

function registerIPC(): void {
  // ── Native OS notification ─────────────────────────────────────────────────
  ipcMain.on('notify', (_evt, { title, body }: { title: string; body: string }) => {
    new Notification({ title, body }).show()
  })

  // ── Open in system browser ─────────────────────────────────────────────────
  ipcMain.on('open-external', (_evt, url: string) => {
    shell.openExternal(url)
  })

  // ── App version ────────────────────────────────────────────────────────────
  ipcMain.handle('get-version', () => app.getVersion())

  // ── Camera controls ────────────────────────────────────────────────────────
  ipcMain.on('start-camera', (_evt, config: CameraConfig) => {
    startCamera(config)
  })

  ipcMain.on('stop-camera', () => {
    stopCamera()
  })

  ipcMain.handle('get-camera-status', () => getCameraStatus())
}

// ─────────────────────────────────────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  startBackend()
  createWindow()
  createTray()
  registerIPC()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  // Keep alive in tray on Windows / Linux
})

app.on('before-quit', () => {
  app.isQuitting = true
  stopCamera()
  stopBackend()
})

// Allow isQuitting on Electron app object
declare global {
  namespace Electron {
    interface App { isQuitting: boolean }
  }
}
