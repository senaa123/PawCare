// src/app/alerts/page.tsx — NEW
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Alert } from '@/types';
import { timeAgo } from '@/lib/utils';

const fetchAlerts = () => api.get<Alert[]>('/alerts/').then((r: { data: Alert[] }) => r.data);
const markRead    = (id: string) => api.patch(`/alerts/${id}/read`);

const SEVERITY_STYLES = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-blue-100 text-blue-700 border-blue-200',
};

const SEVERITY_DOT = {
  high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500',
};

export default function AlertsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'high' | 'medium' | 'low'>('all');

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    refetchInterval: 15_000,   // poll every 15s for new alerts
  });

  const markReadM = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const filtered = alerts.filter((a: Alert) => {
    if (filter === 'unread') return a.status === 'active';
    if (filter === 'high')   return a.severity === 'critical';
    if (filter === 'medium') return a.severity === 'warning';
    if (filter === 'low')    return a.severity === 'info';
    return true;
  });

  const unreadCount = alerts.filter((a: Alert) => a.status === 'active').length;

  if (isLoading) return <div className="p-6 text-gray-400">Loading alerts…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => alerts.filter((a: Alert) => a.status === 'active').forEach((a: Alert) => markReadM.mutate(String(a.id)))}
            className="text-sm text-blue-600 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'unread', 'high', 'medium', 'low'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f} {f === 'all' ? `(${alerts.length})` : f === 'unread' ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-14">
          <p className="text-3xl mb-2">🔔</p>
          <p className="font-semibold text-gray-700">No alerts</p>
          <p className="text-sm text-gray-400 mt-1">
            {filter !== 'all' ? 'Try a different filter' : 'Everything looks good'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((alert: Alert) => (
            <div
              key={alert.id}
              className={`card flex items-start gap-4 transition-opacity ${
                alert.status !== 'active' ? 'opacity-60' : ''
              }`}
            >
              {/* Severity dot */}
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                SEVERITY_DOT[alert.severity as keyof typeof SEVERITY_DOT] ?? 'bg-gray-400'
              }`} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{alert.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize shrink-0 ${
                    SEVERITY_STYLES[alert.severity as keyof typeof SEVERITY_STYLES] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {alert.severity}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-gray-400">{timeAgo(alert.created_at)}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400 capitalize">{alert.type?.replace('_', ' ')}</span>
                  {alert.status === 'active' && (
                    <button
                      onClick={() => markReadM.mutate(String(alert.id))}
                      className="text-xs text-blue-600 hover:underline ml-auto"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}