// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}
export interface AuthTokens {
  access_token: string;
  token_type: string;
}
export interface RegisterRequest {
  email: string;
  full_name: string;
  password: string;
}

// ─── Cats ────────────────────────────────────────────────────────────────────
export interface Cat {
  id: number;
  name: string;
  breed?: string;
  age_years?: number;
  weight_kg?: number;
  color?: string;
  notes?: string;
  profile_image_url?: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}
export interface CreateCatRequest {
  name: string;
  breed?: string;
  age_years?: number;
  weight_kg?: number;
  color?: string;
  notes?: string;
}

// ─── Streams ─────────────────────────────────────────────────────────────────
export type StreamStatus = "active" | "inactive" | "error";
export type StreamType   = "webcam" | "rtsp" | "http" | "esp32";

export interface CameraStream {
  id: number;
  name: string;
  stream_url: string;
  stream_type: StreamType;
  location?: string;
  is_active: boolean;
  status: StreamStatus;
  owner_id: number;
  created_at: string;
  updated_at: string;
}
export interface CreateStreamRequest {
  name: string;
  stream_url: string;
  stream_type: StreamType;
  location?: string;
}

// ─── Detections ──────────────────────────────────────────────────────────────
export type DetectionType = "cat" | "unknown_cat" | "behavior" | "sound";
export interface DetectionEvent {
  id: number;
  stream_id: number;
  cat_id?: number;
  cat_name?: string;
  detection_type: DetectionType;
  confidence: number;
  behavior?: string;
  sound_class?: string;
  thumbnail_url?: string;
  timestamp: string;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
export type AlertType     = "cat_detected" | "unknown_cat" | "excessive_meowing"
                          | "abnormal_inactivity" | "feeding_reminder" | "automation_triggered";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus   = "active" | "acknowledged" | "resolved";

export interface Alert {
  id: number;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  cat_id?: number;
  stream_id?: number;
  created_at: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface DashboardStats {
  active_cameras: number;
  total_cats: number;
  detections_today: number;
  active_alerts: number;
}

// ─── WebSocket ───────────────────────────────────────────────────────────────
export interface WsDetectionEvent { type: "detection"; data: DetectionEvent; }
export interface WsAlertEvent     { type: "alert";     data: Alert; }
export type WsEvent = WsDetectionEvent | WsAlertEvent;