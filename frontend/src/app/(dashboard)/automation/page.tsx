// src/app/(dashboard)/automation/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Trash2, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

// ── types ──────────────────────────────────────────────────────────────────────
interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  action_config: Record<string, string> | null;
  conditions: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

interface RuleCreate {
  name: string;
  trigger: string;
  action: string;
  action_config?: Record<string, string>;
}

// ── constants from backend constants.py ───────────────────────────────────────
const TRIGGERS = [
  { value: 'cat.detected',       label: 'Cat Detected' },
  { value: 'cat.identified',     label: 'Cat Identified' },
  { value: 'audio.vocalization', label: 'Sound Detected' },
  { value: 'behavior.anomaly',   label: 'Routine Anomaly' },
  { value: 'motion.detected',    label: 'Motion Detected' },
];

const ACTIONS = [
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'trigger_feeder',    label: 'Trigger Feeder' },
  { value: 'record_video',      label: 'Record Video' },
  { value: 'play_sound',        label: 'Play Sound' },
  { value: 'send_webhook',      label: 'Send Webhook' },
];

const TRIGGER_COLORS: Record<string, string> = {
  'cat.detected':       'bg-emerald-100 text-emerald-700',
  'cat.identified':     'bg-violet-100 text-violet-700',
  'audio.vocalization': 'bg-blue-100 text-blue-700',
  'behavior.anomaly':   'bg-red-100 text-red-700',
  'motion.detected':    'bg-amber-100 text-amber-700',
};

const ACTION_ICONS: Record<string, string> = {
  send_notification: '🔔',
  trigger_feeder:    '🍽️',
  record_video:      '📹',
  play_sound:        '🔊',
  send_webhook:      '🔗',
};

// ── API ────────────────────────────────────────────────────────────────────────
const fetchRules  = () => api.get<AutomationRule[]>('/automation/').then(r => r.data);
const createRule  = (data: RuleCreate) => api.post('/automation/', data).then(r => r.data);
const toggleRule  = (id: string) => api.patch(`/automation/${id}/toggle`).then(r => r.data);
const deleteRule  = (id: string) => api.delete(`/automation/${id}`);

// ── Create Modal ───────────────────────────────────────────────────────────────
function CreateRuleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { addToast } = useToast();

  const [name,    setName]    = useState('');
  const [trigger, setTrigger] = useState(TRIGGERS[0].value);
  const [action,  setAction]  = useState(ACTIONS[0].value);
  // action_config: for send_notification/send_webhook we collect a message/url
  const [configValue, setConfigValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Determine what extra config field to show based on selected action
  const configLabel =
    action === 'send_notification' ? 'Notification message (optional)' :
    action === 'send_webhook'      ? 'Webhook URL' :
    null;

  const createM = useMutation({
    mutationFn: createRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] });
      addToast('Rule created', 'success');
      onClose();
    },
    onError: () => setError('Failed to create rule. Check all fields.'),
  });

  async function handleSubmit() {
    if (!name.trim()) { setError('Name is required.'); return; }

    const payload: RuleCreate = {
      name: name.trim(),
      trigger,
      action,
    };

    if (configValue.trim()) {
      const key = action === 'send_notification' ? 'message' : 'url';
      payload.action_config = { [key]: configValue.trim() };
    }

    setLoading(true);
    setError(null);
    await createM.mutateAsync(payload);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900">New Automation Rule</h2>

        <div className="flex flex-col gap-3">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Rule name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Alert when Milo is spotted"
              className="input-field w-full"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">When this happens…</label>
            <select value={trigger} onChange={e => setTrigger(e.target.value)} className="input-field w-full">
              {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Action */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Do this…</label>
            <select value={action} onChange={e => setAction(e.target.value)} className="input-field w-full">
              {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          {/* Optional config field */}
          {configLabel && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">{configLabel}</label>
              <input
                value={configValue}
                onChange={e => setConfigValue(e.target.value)}
                placeholder={action === 'send_webhook' ? 'https://...' : 'Your message here'}
                className="input-field w-full"
              />
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? 'Creating…' : 'Create Rule'}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AutomationPage() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [showCreate, setShowCreate] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: fetchRules,
  });

  const toggleM = useMutation({
    mutationFn: (id: string) => toggleRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] });
      addToast('Rule deleted', 'info');
    },
  });

  const triggerLabel = (t: string) => TRIGGERS.find(x => x.value === t)?.label ?? t;
  const actionLabel  = (a: string) => ACTIONS.find(x => x.value === a)?.label ?? a;

  if (isLoading) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Rules that fire when AI events happen
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="card text-center py-16">
          <Zap className="mx-auto mb-3 text-gray-300" size={36} />
          <p className="font-semibold text-gray-700">No automation rules yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            Create a rule to automatically react to AI events
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            Create first rule
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rules.map(rule => (
            <div key={rule.id} className={`card flex items-start gap-4 transition-opacity ${rule.is_active ? '' : 'opacity-50'}`}>
              {/* Action icon */}
              <span className="text-2xl shrink-0 mt-0.5">
                {ACTION_ICONS[rule.action] ?? '⚡'}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{rule.name}</p>
                  {!rule.is_active && (
                    <span className="text-[11px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Disabled</span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {/* Trigger pill */}
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TRIGGER_COLORS[rule.trigger] ?? 'bg-gray-100 text-gray-600'}`}>
                    {triggerLabel(rule.trigger)}
                  </span>
                  <span className="text-gray-300 text-xs">→</span>
                  {/* Action pill */}
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {actionLabel(rule.action)}
                  </span>
                </div>

                {/* Config preview */}
                {rule.action_config && Object.keys(rule.action_config).length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {Object.entries(rule.action_config).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                  </p>
                )}

                <p className="text-[11px] text-gray-300 mt-1">Created {timeAgo(rule.created_at)}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleM.mutate(rule.id)}
                  title={rule.is_active ? 'Disable' : 'Enable'}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {rule.is_active
                    ? <ToggleRight size={22} className="text-blue-500" />
                    : <ToggleLeft size={22} />}
                </button>
                <button
                  onClick={() => deleteM.mutate(rule.id)}
                  title="Delete rule"
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateRuleModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}