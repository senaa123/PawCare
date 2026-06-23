// src/app/(dashboard)/cats/[id]/page.tsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import type { Cat } from '@/types';
import { timeAgo } from '@/lib/utils';

// ── API ────────────────────────────────────────────────────────────────────────
const fetchCat        = (id: string) => api.get<Cat>(`/cats/${id}`).then(r => r.data);
const fetchDetections = (id: string) => api.get(`/cats/${id}/detections?limit=20`).then(r => r.data);

interface Detection {
  id: string;
  confidence: number;
  track_id: string | null;
  timestamp: string;
}

// ── page ───────────────────────────────────────────────────────────────────────
export default function CatProfilePage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params is a Promise
  const { id } = use(params);

  const catQ  = useQuery({ queryKey: ['cat', id],        queryFn: () => fetchCat(id) });
  const detQ  = useQuery({ queryKey: ['cat-dets', id],   queryFn: () => fetchDetections(id) });

  if (catQ.isLoading) return <div className="p-6 text-gray-400">Loading…</div>;
  if (!catQ.data)     return <div className="p-6 text-gray-400">Cat not found.</div>;

  const cat: Cat               = catQ.data;
  const detections: Detection[] = detQ.data ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">

      {/* Back link */}
      <Link href="/cats" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors w-fit">
        <ArrowLeft size={14} /> Back to cats
      </Link>

      {/* Profile card */}
      <div className="card flex items-start gap-5">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-2xl shrink-0">
          🐱
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{cat.name}</h1>
          {cat.breed && <p className="text-sm text-gray-500 mt-0.5">{cat.breed}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-4">
            {cat.age_years && (
              <Stat label="Age" value={`${cat.age_years} yr${cat.age_years > 1 ? 's' : ''}`} />
            )}
            {cat.weight_kg && (
              <Stat label="Weight" value={`${cat.weight_kg} kg`} />
            )}
            {cat.color && (
              <Stat label="Colour" value={cat.color} />
            )}
          </div>

          {cat.notes && (
            <p className="text-sm text-gray-500 mt-3 italic">&quot;{cat.notes}&quot;</p>
          )}
        </div>
      </div>

      {/* Face enrollment status */}
      <div className={`card flex items-center gap-3 ${cat.profile_image_url ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'} border`}>
        <span className="text-xl">{cat.profile_image_url ? '✅' : '⚠️'}</span>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {cat.profile_image_url ? 'Face enrolled' : 'Face not enrolled'}
          </p>
          <p className="text-xs text-gray-500">
            {cat.profile_image_url
              ? 'The edge camera can identify this cat by face.'
              : 'Go to My Cats and click "Enroll Face" to enable automatic identification.'}
          </p>
        </div>
      </div>

      {/* Recent detections */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Detections</h2>
          <span className="text-xs text-gray-400">Last 20</span>
        </div>

        {detQ.isLoading ? (
          <p className="text-sm text-gray-300 py-4 text-center">Loading…</p>
        ) : detections.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-300 text-3xl mb-2">📷</p>
            <p className="text-sm text-gray-400">No detections recorded yet.</p>
            <p className="text-xs text-gray-300 mt-1">
              Start the edge worker with --enable-face to identify this cat.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {detections.map((det) => (
              <div key={det.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                {/* Confidence dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  det.confidence > 0.85 ? 'bg-emerald-500' :
                  det.confidence > 0.65 ? 'bg-amber-400' : 'bg-red-400'
                }`} />

                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700">
                    {(det.confidence * 100).toFixed(0)}% confidence
                    {det.track_id && <span className="text-gray-400"> · Track #{det.track_id}</span>}
                  </span>
                </div>

                <span className="text-xs text-gray-400 tabular-nums shrink-0">
                  {timeAgo(det.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}