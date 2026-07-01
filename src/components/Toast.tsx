import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-[calc(env(safe-area-inset-top)+1rem)] inset-x-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-2xl backdrop-blur-2xl saturate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border pointer-events-auto max-w-sm w-full",
                toast.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" :
                toast.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400" :
                "bg-white/60 dark:bg-zinc-900/60 border-white/40 dark:border-white/10 text-gray-900 dark:text-white"
              )}
            >
              {toast.type === 'success' && <Icons.CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <Icons.AlertCircle className="w-5 h-5" />}
              {toast.type === 'info' && <Icons.Info className="w-5 h-5" />}
              <span className="min-w-0 font-medium text-sm leading-snug">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
