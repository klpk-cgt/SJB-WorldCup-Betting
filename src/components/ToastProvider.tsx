import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Info, LoaderCircle, Trophy, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info' | 'loading' | 'celebrate' | 'badge';

type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
  description?: string;
  duration?: number;
};

type ToastContextValue = {
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  success: (message: string, description?: string) => string;
  error: (message: string, description?: string) => string;
  info: (message: string, description?: string) => string;
  loading: (message: string, description?: string) => string;
  celebrate: (message: string, description?: string) => string;
  badge: (message: string, description?: string) => string;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_META: Record<
  ToastTone,
  { icon: React.ReactNode; panel: string; iconTone: string; defaultDuration: number }
> = {
  success: {
    icon: <CheckCircle2 className="h-4.5 w-4.5" />,
    panel: 'border-emerald-100 bg-emerald-50/95 text-emerald-950',
    iconTone: 'text-emerald-600',
    defaultDuration: 2600,
  },
  error: {
    icon: <AlertTriangle className="h-4.5 w-4.5" />,
    panel: 'border-rose-100 bg-rose-50/95 text-rose-950',
    iconTone: 'text-rose-600',
    defaultDuration: 3600,
  },
  info: {
    icon: <Info className="h-4.5 w-4.5" />,
    panel: 'border-sky-100 bg-sky-50/95 text-sky-950',
    iconTone: 'text-sky-600',
    defaultDuration: 2600,
  },
  loading: {
    icon: <LoaderCircle className="h-4.5 w-4.5 animate-spin" />,
    panel: 'border-slate-200 bg-white/95 text-slate-950',
    iconTone: 'text-slate-600',
    defaultDuration: 0,
  },
  celebrate: {
    icon: <Trophy className="h-4.5 w-4.5" />,
    panel: 'border-amber-100 bg-amber-50/95 text-amber-950',
    iconTone: 'text-amber-600',
    defaultDuration: 4000,
  },
  badge: {
    icon: <Bell className="h-4.5 w-4.5" />,
    panel: 'border-violet-100 bg-violet-50/95 text-violet-950',
    iconTone: 'text-violet-600',
    defaultDuration: 4000,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutIds = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timeout = timeoutIds.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutIds.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = toast.duration ?? TONE_META[toast.tone].defaultDuration;
      const entry: ToastItem = { ...toast, id, duration };

      setToasts((current) => [...current, entry]);

      if (duration > 0) {
        const timeout = setTimeout(() => dismissToast(id), duration);
        timeoutIds.current.set(id, timeout);
      }

      return id;
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      success: (message, description) => showToast({ tone: 'success', message, description }),
      error: (message, description) => showToast({ tone: 'error', message, description }),
      info: (message, description) => showToast({ tone: 'info', message, description }),
      loading: (message, description) => showToast({ tone: 'loading', message, description }),
      celebrate: (message, description) => showToast({ tone: 'celebrate', message, description }),
      badge: (message, description) => showToast({ tone: 'badge', message, description }),
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex justify-center px-4">
        <div className="flex w-full max-w-md flex-col gap-2">
          {toasts.map((toast) => {
            const meta = TONE_META[toast.tone];
            return (
              <div
                key={toast.id}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_16px_30px_rgba(15,23,42,0.12)] backdrop-blur ${meta.panel}`}
              >
                <div className={`mt-0.5 shrink-0 ${meta.iconTone}`}>{meta.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">{toast.message}</p>
                  {toast.description && <p className="mt-1 text-xs leading-5 opacity-80">{toast.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                  aria-label="关闭提示"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
