/* ── AutomationPage.tsx ──────────────────────────────────────────────────────
   Automation rules screen.
   Empty state: oat icon chip with idle sway, Fraunces heading, hint bar.
   Populated: stacked white rule cards with toggle + edit/delete.
─────────────────────────────────────────────────────────────────────────── */
import { useState }                               from 'react'
import { useQuery, useMutation, useQueryClient }  from '@tanstack/react-query'
import { api }                                    from '@/lib/api'

interface Rule {
  id:          string
  name:        string
  description: string
  is_active:   boolean
  trigger:     string
  action:      string
}

const fetchRules = () => api.get<Rule[]>('/automation/').then((r) => r.data).catch(() => [])
const deleteRule = (id: string) => api.delete(`/automation/${id}`)
const toggleRule = (id: string) => api.patch(`/automation/${id}/toggle`)

/* ── Add rule modal ─────────────────────────────────────────────────────── */
function AddRuleModal({ onClose }: { onClose: () => void }) {
  const qc                              = useQueryClient()
  const [name, setName]                 = useState('')
  const [trigger, setTrigger]           = useState('excessive_crying')
  const [action, setAction]             = useState('send_notification')
  const [pressed, setPressed]           = useState(false)

  const mut = useMutation({
    mutationFn: () =>
      api.post('/automation/rules', { name, trigger, action, is_active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); onClose() },
  })

  const TRIGGERS = [
    { value: 'excessive_crying', label: 'Excessive crying detected' },
    { value: 'anomaly_detected', label: 'Routine anomaly detected'  },
    { value: 'no_eating',        label: 'No eating for 12 hours'    },
    { value: 'aggression',       label: 'Aggression detected'       },
  ]
  const ACTIONS = [
    { value: 'send_notification', label: 'Send notification'  },
    { value: 'send_email',        label: 'Send email alert'   },
    { value: 'play_sound',        label: 'Play sound alert'   },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in" style={{ opacity: 0 }}>
        <h2 className="text-ink mb-5" style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600 }}>
          Create rule
        </h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-ink text-sm font-medium mb-1.5">Rule name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alert when Milo cries"
              className="pc-input"
            />
          </div>
          <div>
            <label className="block text-ink text-sm font-medium mb-1.5">Trigger</label>
            <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="pc-input">
              {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-ink text-sm font-medium mb-1.5">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="pc-input">
              {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 100); mut.mutate() }}
            disabled={!name.trim() || mut.isPending}
            className="btn-forest flex-1"
            style={{ transform: pressed ? 'scale(0.97)' : 'scale(1)', transition: 'transform 100ms' }}
          >
            {mut.isPending ? 'Saving…' : 'Create rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Toggle switch ──────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className="relative inline-flex items-center rounded-full transition-colors duration-150 flex-shrink-0"
      style={{
        width: 40, height: 22,
        background: checked ? '#1F3A2E' : '#D6CDB4',
      }}
    >
      <span
        className="absolute bg-white rounded-full shadow-sm"
        style={{
          width: 16, height: 16,
          left: checked ? 20 : 4,
          transition: 'left 150ms ease',
        }}
      />
    </button>
  )
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function AutomationPage() {
  const qc                          = useQueryClient()
  const [showModal, setShowModal]   = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: rules = [], isLoading } = useQuery<Rule[]>({
    queryKey: ['rules'],
    queryFn:  fetchRules,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess:  () => { setDeletingId(null); qc.invalidateQueries({ queryKey: ['rules'] }) },
  })

  const toggleMut = useMutation({
    mutationFn: (id: string) => toggleRule(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['rules'] }),
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 animate-in" style={{ opacity: 0 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: 'Fraunces, serif', fontWeight: 600 }} className="text-ink">
            Automation rules
          </h1>
          <p className="text-ink-muted text-sm mt-1">Set triggers and automatic actions for your cats</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          + Add rule
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-[#E8DFC8] animate-pulse" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-[#E8DFC8] shadow-card p-16 flex flex-col items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl bg-oat flex items-center justify-center text-2xl animate-sway"
            >
              ⚡
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600 }} className="text-ink">
              No rules yet
            </h2>
            <p className="text-ink-muted text-sm text-center max-w-xs">
              Rules run automatically — like alerting you when Milo hasn't eaten for 12 hours.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-forest mt-2"
            >
              Create rule
            </button>
          </div>

          {/* Hint bar */}
          <div className="flex items-center gap-3 bg-oat rounded-xl px-5 py-4">
            <span className="text-lg">💡</span>
            <p className="text-ink-muted text-sm">
              Example: <span className="text-ink font-medium">When "Milo cries excessively" → Send push notification</span>
            </p>
          </div>
        </div>
      ) : (
        /* ── Rule list ── */
        <div className="flex flex-col gap-3">
          {rules.map((rule, i) => (
            <div
              key={rule.id}
              className="bg-white rounded-xl border border-[#E8DFC8] shadow-card px-5 py-4 flex items-center gap-4 animate-in"
              style={{
                animationDelay: `${i * 50}ms`,
                opacity: deletingId === rule.id ? 0 : 0,
                transform: deletingId === rule.id ? 'scale(0.96)' : undefined,
                transition: 'opacity 200ms, transform 200ms',
              }}
            >
              {/* Toggle */}
              <Toggle
                checked={rule.is_active}
                onChange={() => toggleMut.mutate(rule.id)}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-ink text-sm font-semibold truncate">{rule.name}</p>
                <p className="text-ink-muted text-xs mt-0.5 truncate">
                  {rule.trigger?.replace(/_/g, ' ')} → {rule.action?.replace(/_/g, ' ')}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={() => { setDeletingId(rule.id); deleteMut.mutate(rule.id) }}
                className="text-ink-light hover:text-red-500 transition-colors text-sm"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && <AddRuleModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
