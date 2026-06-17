"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Camera } from "lucide-react";
import TopBar         from "@/components/shared/TopBar";
import StreamCard     from "@/components/camera/StreamCard";
import AddStreamModal from "@/components/camera/AddStreamModal";
import { streamsApi } from "@/lib/api";

export default function StreamsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: streams, isLoading } = useQuery({
    queryKey: ["streams"],
    queryFn:  () => streamsApi.list().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: streamsApi.delete,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["streams"] }),
  });

  function handleDelete(id: number) {
    if (confirm("Remove this camera stream?")) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <>
      <TopBar
        title="Cameras"
        subtitle="Manage your connected camera streams."
      />

      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-text-muted text-sm">
            {streams ? `${streams.length} stream${streams.length !== 1 ? "s" : ""} configured` : ""}
          </p>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add camera
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card h-52 animate-pulse bg-muted" />
            ))}
          </div>
        ) : streams && streams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.map((s) => (
              <StreamCard key={s.id} stream={s} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Camera size={56} className="text-pawblue mb-4" />
            <h3 className="font-display font-bold text-text text-xl">No cameras connected</h3>
            <p className="text-text-muted text-sm mt-2 mb-6 max-w-xs">
              Connect a webcam, RTSP feed, or ESP32 camera to start AI monitoring.
            </p>
            <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Connect your first camera
            </button>
          </div>
        )}
      </main>

      <AddStreamModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}