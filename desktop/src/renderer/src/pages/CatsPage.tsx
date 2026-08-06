import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Cat } from '@/types'
import { TopBar }   from '@/components/shared/TopBar'
import { useToast } from '@/components/ui/Toast'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000'

const fetchCats   = () => api.get<Cat[]>('/cats/').then((r) => r.data)
const deleteCat   = (id: string) => api.delete(`/cats/${id}`)
const uploadImage = (catId: string, file: File) => {
  const form = new FormData()
  form.append('image', file)
  return api.post(`/cats/${catId}/upload-image`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
const enrollFace = (catId: string, files: File[]) => {
  const form = new FormData()
  files.forEach((f) => form.append('photos', f))
  return api.post(`/cats/${catId}/enroll`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
const createCat = (data: { name: string; breed?: string; weight_kg?: number; notes?: string }) =>
  api.post<Cat>('/cats/', data).then((r) => r.data)

const updateCat = (catId: string, data: { name?: string; breed?: string; weight_kg?: number; notes?: string }) =>
  api.patch<Cat>(`/cats/${catId}`, data).then((r) => r.data)

// ── CatAvatar with hover-to-upload ────────────────────────────────────────────
function CatAvatar({ cat, onUploaded }: { cat: Cat; onUploaded: () => void }) {
  const { addToast } = useToast()
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadImage(cat.id, file)
      addToast(`${cat.name}'s photo updated`, 'success')
      onUploaded()
    } catch { addToast('Upload failed', 'error') }
  }
  return (
    <label className="relative cursor-pointer group w-14 h-14 shrink-0">
      <div className="w-14 h-14 rounded-full overflow-hidden bg-[#E8813A]/20 flex items-center justify-center text-2xl">
        {cat.profile_image_url
          ? <img src={`${API_BASE}${cat.profile_image_url}`} alt={cat.name} className="w-full h-full object-cover" />
          : '🐱'}
      </div>
      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-white text-xs">📷</span>
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </label>
  )
}

// ── Enroll Modal ──────────────────────────────────────────────────────────────
interface EnrollResult {
  detected_breed:    string | null
  breed_confidence:  number
  breed_auto_filled: boolean
  photos_used:       number
}

function EnrollModal({ cat, onClose, onSuccess }: {
  cat: Cat
  onClose: () => void
  onSuccess: () => void
}) {
  const [files,   setFiles]   = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [result,  setResult]  = useState<EnrollResult | null>(null)
  const { addToast } = useToast()

  async function handleSubmit() {
    if (files.length === 0) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await enrollFace(cat.id, files)
      const data = res.data as EnrollResult
      setResult(data)
      onSuccess()
      addToast(
        data.breed_auto_filled
          ? `${cat.name} enrolled! Breed detected: ${data.detected_breed}`
          : `${cat.name}'s face enrolled successfully`,
        'success'
      )
    } catch {
      setError("Enrollment failed. Make sure each photo clearly shows the cat's face.")
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">{cat.name} is Enrolled!</h2>
          <p className="text-sm text-gray-500 mb-5">
            Face profile created from {result.photos_used} photo{result.photos_used > 1 ? 's' : ''}.
          </p>

          {result.breed_auto_filled && result.detected_breed ? (
            <div className="bg-gradient-to-r from-pawblue-light to-emerald-50 border border-pawblue/30 rounded-xl p-4 mb-5 text-left">
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-1">
                🧬 Breed Detected by AI
              </p>
              <p className="text-xl font-bold text-pawblue-dark">{result.detected_breed}</p>
              <p className="text-xs text-text-muted mt-0.5">
                Confidence: {(result.breed_confidence * 100).toFixed(1)}%
                — automatically saved to {cat.name}'s profile
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 text-left">
              <p className="text-xs text-text-muted">
                Breed confidence was below threshold — you can edit the breed anytime.
              </p>
            </div>
          )}

          <button onClick={onClose} className="btn-primary w-full">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Enroll {cat.name}&apos;s Face</h2>
        <p className="text-sm text-gray-500 mb-1">Upload 1–10 clear photos.</p>
        <p className="text-xs text-pawblue-dark bg-pawblue-light rounded-lg px-3 py-2 mb-4">
          🧬 The AI will also automatically detect {cat.name}'s breed from the photos!
        </p>
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-pawblue-dark transition-colors">
            <p className="text-sm text-gray-500">
              {files.length === 0 ? 'Click to select photos (JPG / PNG)' : `${files.length} photo${files.length > 1 ? 's' : ''} selected`}
            </p>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 justify-center">
                {files.map((f, i) => <span key={i} className="text-xs bg-pawblue-light text-pawblue-dark px-2 py-0.5 rounded-full">{f.name}</span>)}
              </div>
            )}
          </div>
          <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        </label>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={handleSubmit} disabled={files.length === 0 || loading} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? '🧬 Analysing…' : 'Enroll + Detect Breed'}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Cat Modal ────────────────────────────────────────────────────────────
function EditCatModal({ cat, onClose }: { cat: Cat; onClose: () => void }) {
  const qc = useQueryClient()
  const { addToast } = useToast()
  const [name, setName]     = useState(cat.name)
  const [breed, setBreed]   = useState(cat.breed ?? '')
  const [weight, setWeight] = useState(cat.weight_kg ? String(cat.weight_kg) : '')
  const [notes, setNotes]   = useState(cat.notes ?? '')

  const mut = useMutation({
    mutationFn: () => updateCat(cat.id, {
      name,
      breed: breed || undefined,
      weight_kg: weight ? parseFloat(weight) : undefined,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cats'] })
      addToast(`${name}'s profile updated!`, 'success')
      onClose()
    },
    onError: () => addToast('Failed to update cat profile', 'error'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Edit {cat.name}&apos;s Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Breed</label>
            <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Domestic Shorthair" className="input-field" />
          </div>
          <div>
            <label className="label">Weight (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="4.2" className="input-field" />
          </div>
          <div>
            <label className="label">Notes / Health Info</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special diet, medical needs..." className="input-field h-20 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => mut.mutate()} disabled={!name || mut.isPending} className="btn-primary flex-1 disabled:opacity-50">
            {mut.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Add Cat Modal ─────────────────────────────────────────────────────────────
function AddCatModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName]     = useState('')
  const [breed, setBreed]   = useState('')
  const [weight, setWeight] = useState('')
  const [notes, setNotes]   = useState('')
  const { addToast } = useToast()

  const mut = useMutation({
    mutationFn: () => createCat({
      name,
      breed: breed || undefined,
      weight_kg: weight ? parseFloat(weight) : undefined,
      notes: notes || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cats'] }); addToast('Cat added!', 'success'); onClose() },
    onError: () => addToast('Failed to add cat', 'error'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Add a New Cat</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Milo" className="input-field" />
          </div>
          <div>
            <label className="label">Breed</label>
            <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Domestic Shorthair" className="input-field" />
          </div>
          <div>
            <label className="label">Weight (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="4.5" className="input-field" />
          </div>
          <div>
            <label className="label">Notes / Medical Info</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special needs or notes..." className="input-field h-16 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => mut.mutate()} disabled={!name || mut.isPending} className="btn-primary flex-1 disabled:opacity-50">
            {mut.isPending ? 'Adding…' : 'Add Cat'}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CatsPage() {
  const qc = useQueryClient()
  const { addToast } = useToast()
  const [showAdd,    setShowAdd]    = useState(false)
  const [editingCat, setEditingCat] = useState<Cat | null>(null)
  const [enrollCat,  setEnrollCat]  = useState<Cat | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: cats = [], isLoading } = useQuery({ queryKey: ['cats'], queryFn: fetchCats })

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteCat(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cats'] }); addToast('Cat removed', 'info') },
  })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <TopBar
        title="My cats"
        subtitle={`${cats.length} cat${cats.length !== 1 ? 's' : ''} registered`}
      />

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-xl border border-[#E8DFC8] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cats.map((cat, i) => {
            const enrolled = !!(cat as any).face_enrolled
            return (
              <div
                key={cat.id}
                className="bg-white rounded-xl border border-[#E8DFC8] shadow-card p-5 flex flex-col gap-4 animate-in"
                style={{ animationDelay: `${i * 50}ms`, opacity: 0 }}
              >
                {/* Cat header */}
                <div className="flex items-start gap-3">
                  <CatAvatar cat={cat} onUploaded={() => qc.invalidateQueries({ queryKey: ['cats'] })} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#22201B] font-bold text-base truncate">{cat.name}</p>
                    <p className="text-[#6B6558] text-xs">{cat.breed ?? 'Unknown breed'}</p>
                  </div>
                </div>

                {/* Info row */}
                <div className="flex items-center justify-between border-t border-[#F0E6D2] pt-3">
                  <span className="text-[#6B6558] text-xs">
                    {cat.weight_kg ? `${cat.weight_kg} kg` : 'Weight not set'}
                  </span>
                  {enrolled ? (
                    <span className="text-xs font-semibold text-[#2F7D51] bg-[#EDFBF0] px-2.5 py-0.5 rounded-full">
                      Face enrolled
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#9B5B00] bg-[#FFF3CD] px-2.5 py-0.5 rounded-full">
                      Not enrolled
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 border-t border-[#F0E6D2] pt-3">
                  <button
                    onClick={() => setEditingCat(cat)}
                    className="flex-1 text-xs font-semibold text-[#22201B] border border-[#E8DFC8] rounded-lg py-1.5 hover:bg-[#F0E6D2] transition-colors"
                  >
                    Edit
                  </button>

                  {enrolled ? (
                    <button
                      onClick={() => setEnrollCat(cat)}
                      className="flex-1 text-xs font-semibold text-[#E8813A] border border-[#E8DFC8] rounded-lg py-1.5 hover:bg-[#FEF6EC] transition-colors"
                    >
                      Re-enroll
                    </button>
                  ) : (
                    <button
                      onClick={() => setEnrollCat(cat)}
                      className="flex-1 text-xs font-semibold text-white bg-[#1F3A2E] rounded-lg py-1.5 hover:bg-[#152A21] transition-colors"
                    >
                      Enroll face
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (deletingId === cat.id) { deleteM.mutate(cat.id); setDeletingId(null) }
                      else setDeletingId(cat.id)
                    }}
                    className="flex-1 text-xs font-semibold text-red-500 border border-[#E8DFC8] rounded-lg py-1.5 hover:bg-red-50 transition-colors"
                  >
                    {deletingId === cat.id ? 'Confirm?' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}

          {/* Dashed Add a new cat card */}
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl border-2 border-dashed border-[#E3D6BC] bg-[#FBF6ED] hover:bg-[#F0E6D2] transition-colors p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F0E6D2] flex items-center justify-center">
              <span className="text-[#9B8B72] text-xl">+</span>
            </div>
            <span className="text-[#9B8B72] text-sm font-semibold">Add a new cat</span>
          </button>
        </div>
      )}

      {showAdd    && <AddCatModal onClose={() => setShowAdd(false)} />}
      {editingCat && <EditCatModal cat={editingCat} onClose={() => setEditingCat(null)} />}
      {enrollCat  && (
        <EnrollModal
          cat={enrollCat}
          onClose={() => setEnrollCat(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['cats'] })}
        />
      )}
    </div>
  )
}
