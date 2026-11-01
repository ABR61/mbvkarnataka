"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

type ToastContextValue = {
  /** Show a transient toast. Returns nothing; auto-dismisses. */
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Lightweight, dependency-free toast system. Wrap the app once (done in the
 * locale layout); call `useToast().toast("Saved", "success")` from any client
 * component. Toasts stack bottom-right and auto-dismiss.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId.current++;
    setToasts((ts) => [...ts, { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto max-w-sm rounded-md px-4 py-3 text-left text-sm font-medium text-white shadow-lg transition ${
              t.type === "success"
                ? "bg-emerald-600"
                : t.type === "error"
                  ? "bg-red-600"
                  : "bg-gray-800"
            }`}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

/**
 * Fires a toast when a form action result changes. Drop into a form that uses
 * useActionState — pass the returned `state` plus the messages to show. Guards
 * against re-firing for the same result object.
 */
export function useActionToast(
  state: { ok?: boolean; error?: string } | undefined,
  messages: { success?: string; error?: string },
) {
  const { toast } = useToast();
  const seen = useRef<object | null>(null);

  useEffect(() => {
    if (!state || seen.current === state) return;
    seen.current = state;
    if (state.ok && messages.success) toast(messages.success, "success");
    else if (state.error && messages.error) toast(messages.error, "error");
  }, [state, messages, toast]);
}
