"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Cat } from "lucide-react";
import TopBar      from "@/components/shared/TopBar";
import CatCard     from "@/components/cats/CatCard";
import AddCatModal from "@/components/cats/AddCatModal";
import { catsApi } from "@/lib/api";
import type { Cat as CatType } from "@/types";

export default function CatsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<CatType | null>(null);

  const { data: cats, isLoading } = useQuery({
    queryKey: ["cats"],
    queryFn:  () => catsApi.list().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: catsApi.delete,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["cats"] }),
  });

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(cat: CatType) {
    setEditing(cat);
    setModalOpen(true);
  }

  function handleDelete(id: number) {
    if (confirm("Remove this cat profile?")) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <>
      <TopBar
        title="My Cats"
        subtitle="Manage your cat profiles and view their activity."
      />

      <main className="flex-1 p-6">
        {/* Header + add button */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-text-muted text-sm">
            {cats ? `${cats.length} cat${cats.length !== 1 ? "s" : ""} registered` : ""}
          </p>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add cat
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-48 animate-pulse bg-muted" />
            ))}
          </div>
        ) : cats && cats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cats.map((cat) => (
              <CatCard
                key={cat.id}
                cat={cat}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Cat size={56} className="text-pawblue mb-4" />
            <h3 className="font-display font-bold text-text text-xl">No cats yet</h3>
            <p className="text-text-muted text-sm mt-2 mb-6 max-w-xs">
              Add your first cat profile so PawCare can recognise them in your camera feeds.
            </p>
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Add your first cat
            </button>
          </div>
        )}
      </main>

      <AddCatModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        editing={editing}
      />
    </>
  );
}