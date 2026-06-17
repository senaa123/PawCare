import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: string): string {
  return format(new Date(date), "MMM d, h:mm a");
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

export function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export const STREAM_TYPE_LABELS: Record<string, string> = {
  webcam: "Webcam",
  rtsp:   "RTSP Camera",
  http:   "HTTP Stream",
  esp32:  "ESP32 Cam",
};