import { contextBridge, ipcRenderer } from 'electron'

export interface CameraConfig {
  token:       string
  cameraIndex: number
  enableFace:  boolean
  showPreview: boolean
  device:      string
  backendUrl:  string
}

export type CameraStatus = 'running' | 'stopped'

contextBridge.exposeInMainWorld('api', {
  // ── Notifications ──────────────────────────────────────────────────────────
  notify: (title: string, body: string) =>
    ipcRenderer.send('notify', { title, body }),

  // ── External links ─────────────────────────────────────────────────────────
  openExternal: (url: string) =>
    ipcRenderer.send('open-external', url),

  // ── App version ────────────────────────────────────────────────────────────
  getVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-version'),

  // ── Camera controls ────────────────────────────────────────────────────────
  startCamera: (config: CameraConfig) =>
    ipcRenderer.send('start-camera', config),

  stopCamera: () =>
    ipcRenderer.send('stop-camera'),

  getCameraStatus: (): Promise<CameraStatus> =>
    ipcRenderer.invoke('get-camera-status'),

  /** Register a callback that fires whenever the camera process starts/stops */
  onCameraStatusChange: (callback: (status: CameraStatus) => void) => {
    const handler = (_evt: Electron.IpcRendererEvent, status: CameraStatus) => callback(status)
    ipcRenderer.on('camera-status-changed', handler)
    // Return a cleanup function so React can call it in useEffect
    return () => ipcRenderer.removeListener('camera-status-changed', handler)
  },
})
