"use client";
import { Camera, MapPin, Wifi, WifiOff, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { streamsApi } from "@/lib/api";
import { cn, capitalize, STREAM_TYPE_LABELS } from "@/lib/utils";
import type { CameraStream } from "@/types";

const statusStyles: Record<string, string> = {
  active:   "bg-green-100 text-green-600",
  inactive: "bg-gray-100 text-gray-500",
  error:    "bg-red-100 text-red-500",
};

interface Props {
  stream:   CameraStream;
  onDelete: (id: number) => void;
}

export default function StreamCard({ stream, onDelete }: Props) {
  const qc = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      streamsApi.toggle(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streams"] }),
  });

  return (
    <div className="card-hover flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-pawblue-light">
            <Camera size={22} className="text-pawblue-dark" />
          </div>
          <div>
            <h3 className="font-display font-bold text-text">{stream.name}</h3>
            <p className="text-xs text-text-muted">{STREAM_TYPE_LABELS[stream.stream_type]}</p>
          </div>
        </div>
        <button
          onClick={() => onDelete(stream.id)}
          className="p-2 rounded-xl hover:bg-red-50 text-text-light hover:text-red-400 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Status badge */}
      <span className={cn("badge self-start capitalize", statusStyles[stream.status])}>
        {stream.status === "active" ? <Wifi size={11} /> : <WifiOff size={11} />}
        {capitalize(stream.status)}
      </span>

      {/* Location */}
      {stream.location && (
        <div className="flex items-center gap-1.5 text-sm text-text-muted">
          <MapPin size={13} />
          <span>{stream.location}</span>
        </div>
      )}

      {/* URL truncated */}
      <p className="text-xs text-text-light bg-muted rounded-xl px-3 py-2 truncate font-mono">
        {stream.stream_url}
      </p>

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">
          {stream.is_active ? "Active" : "Inactive"}
        </span>
        <button
          onClick={() => toggleMutation.mutate({ id: stream.id, active: !stream.is_active })}
          disabled={toggleMutation.isPending}
          className={cn(
            "relative w-12 h-6 rounded-full transition-colors duration-200",
            stream.is_active ? "bg-pawblue-dark" : "bg-border"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
              stream.is_active ? "translate-x-6" : "translate-x-0"
            )}
          />
        </button>
      </div>
    </div>
  );
}