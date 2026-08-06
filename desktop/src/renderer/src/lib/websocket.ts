// lib/websocket.ts — identical logic, no Next.js dependency
export class ReconnectingWebSocket {
  private ws: WebSocket | null = null
  private shouldReconnect = true

  onMessage: ((e: MessageEvent) => void) | null = null
  onOpen:    (() => void) | null = null
  onClose:   (() => void) | null = null

  constructor(private url: string, private delay = 3000) {
    this.connect()
  }

  private connect() {
    this.ws = new WebSocket(this.url)
    this.ws.onopen    = () => this.onOpen?.()
    this.ws.onmessage = (e) => this.onMessage?.(e)
    this.ws.onclose   = () => {
      this.onClose?.()
      if (this.shouldReconnect)
        setTimeout(() => this.connect(), this.delay)
    }
  }

  send(data: string) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(data)
  }

  close() {
    this.shouldReconnect = false
    if (!this.ws) return

    if (this.ws.readyState === WebSocket.CONNECTING) {
      // If closing while still connecting (e.g. React StrictMode unmount),
      // wait until open before closing to avoid browser console warnings
      const socket = this.ws
      socket.onopen = () => { socket.close() }
    } else if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close()
    }
    this.ws = null
  }
}
