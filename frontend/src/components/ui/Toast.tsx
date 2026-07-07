// components/ui/Toast.tsx
'use client';
import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast  { id: string; message: string; type: ToastType; }
interface ToastCtx { addToast: (msg: string, type?: ToastType) => void; }

const Ctx = createContext<ToastCtx | null>(null);

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-600',
  error:   'bg-red-600',
  warning: 'bg-amber-500',
  info:    'bg-blue-600',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, message, type }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 4000));
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ addToast }}>
      {children}
      {mounted && createPortal(
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id}
              className={`${STYLES[t.type]} pointer-events-auto flex items-start gap-3 text-white text-sm px-4 py-3 rounded-xl shadow-lg max-w-sm`}>
              <span className="flex-1 leading-snug">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-white/60 hover:text-white text-lg leading-none">×</button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx;
}