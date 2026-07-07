'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Cat } from '@/types';
import CatCard from '@/components/cats/CatCard';
import AddCatModal from '@/components/cats/AddCatModal';
import { useToast } from '@/components/ui/Toast';

// ── API calls ──────────────────────────────────────────────────────────────────
const fetchCats   = () => api.get<Cat[]>('/cats/').then((r: { data: Cat[] }) => r.data);
const deleteCat   = (id: string) => api.delete(`/cats/${id}`);

const enrollFace  = (catId: string, files: File[]) => {
  const form = new FormData();
  files.forEach(f => form.append('photos', f));
  return api.post(`/cats/${catId}/enroll`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

const uploadImage = (catId: string, file: File) => {
  const form = new FormData();
  form.append('image', file);
  return api.post(`/cats/${catId}/upload-image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Cat avatar with image upload ───────────────────────────────────────────────
function CatAvatar({ cat, onUploaded }: { cat: Cat; onUploaded: () => void }) {
  const { addToast } = useToast();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadImage(String(cat.id), file);
      addToast(`${cat.name}'s photo updated`, 'success');
      onUploaded();
    } catch {
      addToast('Upload failed', 'error');
    }
  }

  return (
    <label className="relative cursor-pointer group w-14 h-14 shrink-0">
      {/* Avatar — real photo if uploaded, emoji fallback */}
      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-2xl">
        {cat.profile_image_url ? (
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL}${cat.profile_image_url}`}
            alt={cat.name}
            className="w-full h-full object-cover"
          />
        ) : '🐱'}
      </div>

      {/* Camera icon overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-white text-sm">📷</span>
      </div>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </label>
  );
}

// ── Enroll face modal ──────────────────────────────────────────────────────────
function EnrollModal({ cat, onClose }: { cat: Cat; onClose: () => void }) {
  const [files, setFiles]     = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const { addToast } = useToast();

  async function handleSubmit() {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await enrollFace(String(cat.id), files);
      addToast(`${cat.name}'s face enrolled successfully!`, 'success');
      onClose();
    } catch {
      setError("Enrollment failed. Make sure each photo clearly shows the cat's face.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Enroll {cat.name}&apos;s Face
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Upload 1–10 clear photos of {cat.name}&apos;s face. The AI will create a
          face profile so the edge camera can identify {cat.name} automatically.
        </p>

        {/* File picker */}
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
            <p className="text-sm text-gray-500">
              {files.length === 0
                ? 'Click to select photos (JPG / PNG)'
                : `${files.length} photo${files.length > 1 ? 's' : ''} selected`}
            </p>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 justify-center">
                {files.map((f, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={e => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleSubmit}
            disabled={files.length === 0 || loading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? 'Enrolling…' : 'Enroll Face'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CatsPage() {
  const qc = useQueryClient();
  const { addToast } = useToast();

  const [showAdd, setShowAdd]       = useState(false);
  const [enrollCat, setEnrollCat]   = useState<Cat | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: cats = [], isLoading } = useQuery({
    queryKey: ['cats'],
    queryFn: fetchCats,
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteCat(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cats'] });
      addToast('Cat removed', 'info');
    },
  });

  if (isLoading) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Cats</h1>
          <p className="text-sm text-gray-500 mt-1">
            {cats.length} cat{cats.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + Add Cat
        </button>
      </div>

      {/* Empty state */}
      {cats.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🐱</p>
          <p className="font-semibold text-gray-700">No cats yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            Add your first cat to start monitoring
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            Add Cat
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cats.map((cat: Cat) => (
            <div key={cat.id} className="card flex flex-col gap-3">

              {/* Avatar + cat card in a row */}
              <div className="flex items-start gap-3">
                <CatAvatar
                  cat={cat}
                  onUploaded={() => qc.invalidateQueries({ queryKey: ['cats'] })}
                />
                <div className="flex-1 min-w-0">
                  <CatCard cat={cat} onEdit={() => {}} onDelete={() => {}} />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setEnrollCat(cat)}
                  className="flex-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg py-1.5 transition-colors"
                >
                  Enroll Face
                </button>
                <button
                  onClick={() => {
                    if (deletingId === String(cat.id)) {
                      deleteM.mutate(String(cat.id));
                      setDeletingId(null);
                    } else {
                      setDeletingId(String(cat.id));
                    }
                  }}
                  className="flex-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg py-1.5 transition-colors"
                >
                  {deletingId === String(cat.id) ? 'Confirm delete?' : 'Delete'}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddCatModal
          open={showAdd}
          onClose={() => {
            setShowAdd(false);
            qc.invalidateQueries({ queryKey: ['cats'] });
          }}
        />
      )}
      {enrollCat && (
        <EnrollModal
          cat={enrollCat}
          onClose={() => setEnrollCat(null)}
        />
      )}

    </div>
  );
}