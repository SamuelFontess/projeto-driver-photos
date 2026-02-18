'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastTone = 'info' | 'success' | 'error';

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextType {
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setMessages((prev) => [...prev, { ...toast, id }]);

    window.setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-region" role="status" aria-live="polite">
        {messages.map((msg) => (
          <div key={msg.id} className="ui-toast">
            <strong>{msg.title}</strong>
            {msg.description ? <span className="text-secondary">{msg.description}</span> : null}
          </div>
        ))}
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
