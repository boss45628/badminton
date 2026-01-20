"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "info" | "success" | "warning" | "error";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", durationMs = 2200) => {
    const id = uid();
    const item: ToastItem = { id, type, message, createdAt: Date.now() };

    setToasts((prev) => [...prev, item]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast stack */}
      <div className="fixed right-4 top-4 z-[9999] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-2xl border p-3 shadow-md backdrop-blur bg-white/90",
              t.type === "success"
                ? "border-green-200"
                : t.type === "warning"
                  ? "border-amber-200"
                  : t.type === "error"
                    ? "border-red-200"
                    : "border-slate-200",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className={[
                    "text-xs font-bold",
                    t.type === "success"
                      ? "text-green-700"
                      : t.type === "warning"
                        ? "text-amber-700"
                        : t.type === "error"
                          ? "text-red-700"
                          : "text-slate-700",
                  ].join(" ")}
                >
                  {t.type.toUpperCase()}
                </div>
                <div className="mt-1 break-words text-sm font-semibold text-slate-900">{t.message}</div>
              </div>

              <button
                type="button"
                className="rounded-xl px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                aria-label="Close toast"
                title="關閉"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast 必須包在 <ToastProvider> 裡面使用");
  return ctx;
}
