// src/components/Toast.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Toast = { id: number; text: string };
type Ctx = { push: (text: string) => void };

const ToastCtx = createContext<Ctx>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = (text: string) => {
    const id = Date.now();
    setItems(prev => [...prev, { id, text }]);
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3000);
  };

 
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (typeof ce.detail === "string") push(ce.detail);
    };
    window.addEventListener("toast", handler as EventListener);
    return () => window.removeEventListener("toast", handler as EventListener);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {items.map(t => (
          <div key={t.id} className="px-4 py-2 rounded-2xl bg-neutral-800 border border-neutral-700 shadow">
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);


export function notify(text: string) {
  window.dispatchEvent(new CustomEvent("toast", { detail: text }));
}
