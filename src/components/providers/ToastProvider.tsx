'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/ui/Confetti';

type ToastType = 'error' | 'success' | 'info' | 'celebration';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_STYLES: Record<ToastType, { bg: string; border: string }> = {
  error: { bg: 'bg-red-950/90', border: 'border-red-500/30' },
  success: { bg: 'bg-emerald-950/90', border: 'border-emerald-500/30' },
  info: { bg: 'bg-bg-main/90', border: 'border-gold/30' },
  celebration: { bg: 'bg-gold/[0.12]', border: 'border-gold/40' },
};

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  error: <AlertCircle className="size-4 text-red-400 flex-shrink-0" />,
  success: <CheckCircle2 className="size-4 text-emerald-400 flex-shrink-0" />,
  info: <Info className="size-4 text-gold flex-shrink-0" />,
  celebration: <Sparkles className="size-4 text-gold flex-shrink-0" />,
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confettiActive, setConfettiActive] = useState(false);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (type === 'celebration') {
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 3500);
    }
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, type === 'celebration' ? 6000 : 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Confetti active={confettiActive} />
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const s = TOAST_STYLES[toast.type];
          const isCelebration = toast.type === 'celebration';
          return (
            <div
              key={toast.id}
              className={cn('pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg max-w-sm', s.bg, s.border, isCelebration ? 'anim-scale-pop' : 'animate-in slide-in-from-right')}
            >
              {TOAST_ICONS[toast.type]}
              <span className={cn('text-sm flex-1', isCelebration ? 'text-gold font-bold' : 'text-white/90')}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X className="size-3.5 text-white/50" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
