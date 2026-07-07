"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { streamsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const schema = z.object({
  name:        z.string().min(1, "Name is required"),
  stream_url:  z.string().min(1, "Stream URL is required"),
  stream_type: z.enum(["webcam", "rtsp", "http", "esp32"]),
  location:    z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open:    boolean;
  onClose: () => void;
}

export default function AddStreamModal({ open, onClose }: Props) {
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver:     zodResolver(schema),
    defaultValues: { stream_type: "webcam" },
  });

  const mutation = useMutation({
    mutationFn: streamsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["streams"] });
      onClose();
      reset();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-cardHover w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-text text-xl">Add a camera</h2>
          <button onClick={onClose} className="p-2 rounded-2xl hover:bg-muted text-text-light">
            <X size={18} />
          </button>
        </div>

        {mutation.isError && (
          <div className="mb-4 px-4 py-3 bg-red-50 text-red-600 rounded-2xl text-sm">
            Failed to add stream. Check the URL and try again.
          </div>
        )}

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Camera name *</label>
            <input {...register("name")} placeholder="e.g. Living Room Cam" className={cn("input-field", errors.name && "input-error")} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Stream type *</label>
            <select {...register("stream_type")} className="input-field">
              <option value="webcam">Webcam (local)</option>
              <option value="rtsp">RTSP Camera</option>
              <option value="http">HTTP Stream</option>
              <option value="esp32">ESP32 Camera</option>
            </select>
          </div>

          <div>
            <label className="label">Stream URL *</label>
            <input
              {...register("stream_url")}
              placeholder="rtsp://192.168.1.x:554/stream or 0 for webcam"
              className={cn("input-field font-mono text-xs", errors.stream_url && "input-error")}
            />
            {errors.stream_url && <p className="mt-1 text-xs text-red-500">{errors.stream_url.message}</p>}
          </div>

          <div>
            <label className="label">Location (optional)</label>
            <input {...register("location")} placeholder="e.g. Living Room" className="input-field" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {mutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Adding…</> : "Add camera"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}