// src/app/(dashboard)/analytics/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ── API calls ──────────────────────────────────────────────────────────────────
const fetchDaily     = () => api.get('/analytics/detections/daily?days=7').then(r => r.data);
const fetchBehaviors = () => api.get('/analytics/behaviors').then(r => r.data);
const fetchCatStats  = () => api.get('/analytics/cats/activity').then(r => r.data);

// ── colours ────────────────────────────────────────────────────────────────────
const BEHAVIOR_COLORS: Record<string, string> = {
  sitting:  '#6366f1',
  standing: '#f59e0b',
  lying:    '#3b82f6',
  eating:   '#10b981',
  playing:  '#ec4899',
  sleeping: '#8b5cf6',
};
const PIE_FALLBACK = ['#6366f1','#f59e0b','#3b82f6','#10b981','#ec4899','#8b5cf6','#ef4444'];

function formatSeconds(s: number): string {
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

// ── section wrapper ────────────────────────────────────────────────────────────
function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const daily     = useQuery({ queryKey: ['analytics-daily'],     queryFn: fetchDaily });
  const behaviors = useQuery({ queryKey: ['analytics-behaviors'], queryFn: fetchBehaviors });
  const catStats  = useQuery({ queryKey: ['analytics-cats'],      queryFn: fetchCatStats });

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Detection trends and activity breakdown</p>
      </div>

      {/* ── Daily Detections ─────────────────────────────────────────────── */}
      <Section title="Daily Detections" subtitle="Last 7 days">
        {daily.isLoading ? (
          <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Loading…</div>
        ) : daily.data?.length === 0 ? (
          <EmptyChart message="No detections yet. Start the edge worker to see data here." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={daily.data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                // Show only the day number, not the full date
                tickFormatter={(v: string) => new Date(v).getDate().toString()}
              />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip
                formatter={(v: number) => [v, 'Detections']}
                labelFormatter={(l: string) => new Date(l).toLocaleDateString()}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Behavior + Cat stats in a 2-col grid ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Behavior distribution — PieChart */}
        <Section title="Behavior Breakdown" subtitle="Total time per activity">
          {behaviors.isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Loading…</div>
          ) : !behaviors.data?.length ? (
            <EmptyChart message="No activity data yet." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={behaviors.data}
                  dataKey="seconds"
                  nameKey="activity"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ activity, percent }: { activity: string; percent: number }) =>
                    `${activity} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {behaviors.data.map((entry: { activity: string }, i: number) => (
                    <Cell
                      key={entry.activity}
                      fill={BEHAVIOR_COLORS[entry.activity] ?? PIE_FALLBACK[i % PIE_FALLBACK.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatSeconds(v), 'Time']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* Per-cat detections — BarChart */}
        <Section title="Detections per Cat" subtitle="Identified cats only">
          {catStats.isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Loading…</div>
          ) : !catStats.data?.length ? (
            <EmptyChart message="Enroll your cats' faces so the edge node can identify them." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catStats.data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v: number) => [v, 'Detections']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Bar dataKey="detections" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-2 text-gray-300">
      <span className="text-3xl">📊</span>
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}