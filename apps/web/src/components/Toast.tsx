import { useEffect } from "react";
import { Link } from "react-router-dom";

export interface ToastMessage {
  id: number;
  kind: "success" | "error";
  title: string;
  message?: string;
  action?: { label: string; to: string };
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss(): void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(onDismiss, 7000);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) {
    return null;
  }

  const success = toast.kind === "success";

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[24rem]"
      role={success ? "status" : "alert"}
      aria-live={success ? "polite" : "assertive"}
      aria-atomic="true"
    >
      <div
        className={`flex items-start gap-3 rounded-lg border bg-panel/95 px-4 py-3.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur ${
          success ? "border-accent/40" : "border-red-400/40"
        }`}
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
            success ? "bg-accent text-accent-ink" : "bg-red-400/15 text-red-300"
          }`}
        >
          {success ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="size-3.5">
              <path d="m5 12 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
              <path d="M12 8v5m0 3h.01" strokeLinecap="round" />
            </svg>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{toast.title}</p>
          {toast.message ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{toast.message}</p> : null}
          {toast.action ? (
            <Link
              to={toast.action.to}
              onClick={onDismiss}
              className="mt-2 inline-block text-xs font-semibold text-accent underline-offset-4 hover:underline"
            >
              {toast.action.label} →
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-md text-muted transition hover:bg-panel-raised hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
