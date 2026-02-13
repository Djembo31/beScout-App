'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

type ToastType = 'error' | 'success' | 'info';

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
  info: { bg: 'bg-[#0a0a0a]/90', border: 'border-[#FFD700]/30' },
};

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  error: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
  info: <Info className="w-4 h-4 text-[#FFD700] flex-shrink-0" />,
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const s = TOAST_STYLES[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl ${s.bg} border ${s.border} backdrop-blur-xl shadow-lg max-w-sm animate-in slide-in-from-right`}
            >
              {TOAST_ICONS[toast.type]}
              <span className="text-sm text-white/90 flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
