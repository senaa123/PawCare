// lib/websocket.ts
export class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private shouldReconnect = true;

  onMessage: ((e: MessageEvent) => void) | null = null;
  onOpen:    (() => void) | null = null;
  onClose:   (() => void) | null = null;

  constructor(private url: string, private delay = 3000) {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen    = () => this.onOpen?.();
    this.ws.onmessage = (e) => this.onMessage?.(e);
    this.ws.onclose   = () => {
      this.onClose?.();
      if (this.shouldReconnect)
        setTimeout(() => this.connect(), this.delay);
    };
  }

  send(data: string) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(data);
  }

  close() {
    this.shouldReconnect = false;
    this.ws?.close();
  }
}