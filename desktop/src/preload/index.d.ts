// TypeScript declarations for the window.api bridge exposed by preload/index.ts

export interface CameraConfig {
  token:       string
  cameraIndex: number
  enableFace:  boolean
  showPreview: boolean
  device:      string
  backendUrl:  string
}

export type CameraStatus = 'running' | 'stopped'

export interface ElectronAPI {
  // Notifications
  notify:       (title: string, body: string) => void

  // Browser links
  openExternal: (url: string) => void

  // Version
  getVersion:   () => Promise<string>

  // Camera AI worker
  startCamera:          (config: CameraConfig) => void
  stopCamera:           () => void
  getCameraStatus:      () => Promise<CameraStatus>
  onCameraStatusChange: (callback: (status: CameraStatus) => void) => (() => void)
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
