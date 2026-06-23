'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useEventSocket, type LiveEvent } from '@/hooks/useEventSocket';
import { useToast } from '@/components/ui/Toast';

const EVENT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  'cat.detected': { label: 'Cat Detected', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  'cat.identified': { label: 'Cat Identified', color: 'text-violet-700', bg: 'bg-violet-50' },
  'audio.vocalization': { label: 'Sound', color: 'text-blue-700', bg: 'bg-blue-50' },
  'behavior.activity_updated': { label: 'Activity', color: 'text-cyan-700', bg: 'bg-cyan-50' },
  'behavior.anomaly': { label: 'Anomaly', color: 'text-red-700', bg: 'bg-red-50' },
  'alert.created': { label: 'Alert', color: 'text-amber-700', bg: 'bg-amber-50' },
};

const FALLBACK = { label: 'Event', color: 'text-gray-600', bg: 'bg-gray-50' };

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function percent(value: unknown): string | null {
  const numeric = asNumber(value);
  return numeric === null ? null : `${Math.round(numeric * 100)}%`;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function describeEvent(ev: LiveEvent): string {
  const confidence = percent(ev.payload.confidence);
  const identityConfidence = percent(ev.payload.identity_confidence);
  const trackId = asText(ev.payload.track_id);
  const catId = asText(ev.payload.cat_id);
  const behavior = asText(ev.payload.behavior) ?? asText(ev.payload.activity);
  const sound = asText(ev.payload.sound) ?? asText(ev.payload.label);
  const emotion = asText(ev.payload.emotion);
  const title = asText(ev.payload.title);
  const message = asText(ev.payload.message) ?? asText(ev.payload.description);
  const score = percent(ev.payload.score);

  switch (ev.event) {
    case 'cat.detected':
      return [
        trackId ? `Track #${trackId}` : 'Cat detected',
        confidence ? `${confidence} confidence` : null,
        behavior ? `behavior: ${behavior}` : null,
        emotion ? `emotion: ${emotion}` : null,
      ].filter(Boolean).join(' | ');
    case 'cat.identified':
      return [
        catId ? `Cat ${catId}` : 'Known cat identified',
        identityConfidence ? `${identityConfidence} identity confidence` : confidence,
        behavior ? `behavior: ${behavior}` : null,
      ].filter(Boolean).join(' | ');
    case 'behavior.activity_updated':
      return [
        behavior ? `Activity: ${behavior}` : 'Activity updated',
        catId ? `cat ${catId}` : null,
      ].filter(Boolean).join(' | ');
    case 'audio.vocalization':
      return [
        sound ? `Sound: ${sound}` : 'Cat sound detected',
        confidence ? `${confidence} confidence` : null,
      ].filter(Boolean).join(' | ');
    case 'behavior.anomaly':
      return [
        title ?? 'Routine anomaly detected',
        message,
        score ? `score ${score}` : null,
      ].filter(Boolean).join(' | ');
    case 'alert.created':
      return [
        title ?? 'New alert',
        message,
        asText(ev.payload.severity) ? `severity: ${asText(ev.payload.severity)}` : null,
      ].filter(Boolean).join(' | ');
    default:
      return title ?? message ?? ev.event;
  }
}

function toastForEvent(ev: LiveEvent): { message: string; type: 'success' | 'error' | 'info' | 'warning' } | null {
  const behavior = asText(ev.payload.behavior) ?? asText(ev.payload.activity);
  const confidence = percent(ev.payload.confidence);

  switch (ev.event) {
    case 'cat.detected':
      return { message: `Cat spotted${confidence ? ` (${confidence})` : ''}`, type: 'success' };
    case 'cat.identified':
      return { message: 'Known cat identified', type: 'success' };
    case 'behavior.activity_updated':
      return { message: `Activity updated${behavior ? `: ${behavior}` : ''}`, type: 'info' };
    case 'audio.vocalization':
      return { message: 'Cat sound detected', type: 'info' };
    case 'behavior.anomaly':
      return { message: describeEvent(ev), type: 'error' };
    case 'alert.created':
      return { message: `Alert: ${asText(ev.payload.title) ?? 'New alert'}`, type: 'warning' };
    default:
      return null;
  }
}

export default function MonitoringPage() {
  const router = useRouter();
  const { token, _hasHydrated } = useAuthStore();
  const { addToast } = useToast();

  useEffect(() => {
    if (_hasHydrated && !token) router.replace('/login');
  }, [_hasHydrated, token, router]);

  const { events, connected } = useEventSocket(token, (ev) => {
    const toast = toastForEvent(ev);
    if (toast) addToast(toast.message, toast.type);
  });

  if (!_hasHydrated || !token) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edge camera, behavior, sound, routine, and alert events
          </p>
        </div>
        <span className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full shrink-0 ${
          connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
          {connected ? 'Connected' : 'Waiting...'}
        </span>
      </div>

      {events.length === 0 && (
        <div className="card bg-blue-50 border border-blue-100">
          <p className="text-sm font-medium text-blue-800 mb-2">Start the edge AI worker:</p>
          <code className="block bg-blue-900 text-blue-100 text-xs px-4 py-3 rounded-lg whitespace-pre-wrap">
            $env:ROBOFLOW_API_KEY=&quot;your-key&quot;{'\n'}
            python edge_node/main_camera.py --email you@example.com --password yourpass --show --enable-behavior
          </code>
        </div>
      )}

      <div className="card flex flex-col gap-2">
        <h2 className="font-semibold text-gray-900 mb-1">
          Live Events
          {events.length > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({events.length})</span>}
        </h2>

        {events.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Waiting for events...</p>
        ) : (
          events.map((ev, index) => {
            const cfg = EVENT_LABELS[ev.event] ?? FALLBACK;
            return (
              <div key={`${ev.timestamp}-${index}`} className={`${cfg.bg} rounded-lg px-4 py-3 flex items-start gap-3`}>
                <span className={`text-xs font-bold uppercase ${cfg.color} mt-0.5 w-28 shrink-0`}>
                  {cfg.label}
                </span>
                <span className="flex-1 text-sm text-gray-700 break-words">
                  {describeEvent(ev)}
                </span>
                <span className="text-xs text-gray-400 tabular-nums shrink-0">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
