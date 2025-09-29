// packages/ui/src/components/toast.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "../lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastInput {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  dismissible?: boolean;
  action?: ToastAction;
}

interface Toast {
  id: string;
  variant: ToastVariant;
  duration: number;
  dismissible: boolean;
  description?: string;
  action?: ToastAction;
  title: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (
    toast: ToastInput | string,
    variant?: ToastVariant,
    duration?: number
  ) => string;
  removeToast: (id: string) => void;
  removeAll: () => void;
}

const DEFAULT_DURATION = 7000;
const MIN_DURATION = 5000;
const MAX_DURATION = 10000;

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    },
    [clearTimer]
  );

  const scheduleRemoval = useCallback(
    (id: string, duration: number) => {
      if (duration <= 0) {
        return;
      }

      clearTimer(id);
      const timer = setTimeout(() => removeToast(id), duration);
      timers.current.set(id, timer);
    },
    [clearTimer, removeToast]
  );

  const clampDuration = useCallback((duration?: number) => {
    if (typeof duration !== "number" || Number.isNaN(duration)) {
      return DEFAULT_DURATION;
    }

    if (duration === 0) {
      return 0;
    }

    return Math.min(Math.max(duration, MIN_DURATION), MAX_DURATION);
  }, []);

  const addToast = useCallback(
    (
      toastInput: ToastInput | string,
      legacyVariant?: ToastVariant,
      legacyDuration?: number
    ) => {
      const parsed: ToastInput =
        typeof toastInput === "string"
          ? {
              title: toastInput,
              variant: legacyVariant,
              duration: legacyDuration,
              dismissible: true,
            }
          : toastInput;

      const id = parsed.id ?? Math.random().toString(36).slice(2, 11);
      const variant = parsed.variant ?? legacyVariant ?? "info";
      const duration = clampDuration(
        typeof parsed.duration === "number" ? parsed.duration : legacyDuration
      );

      const toast: Toast = {
        id,
        title: parsed.title,
        description: parsed.description,
        variant,
        duration,
        dismissible: parsed.dismissible ?? true,
        action: parsed.action,
      };

      setToasts((prev) => {
        const filtered = prev.filter((existing) => existing.id !== id);
        return [...filtered, toast];
      });

      scheduleRemoval(id, duration);

      return id;
    },
    [clampDuration, scheduleRemoval]
  );

  const removeAll = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    const timersMap = timers.current;

    return () => {
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      removeAll,
    }),
    [addToast, removeAll, removeToast, toasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastViewportProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastViewport({ toasts, onRemove }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:max-w-md">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

const variantStyles: Record<
  ToastVariant,
  {
    icon: LucideIcon;
    accent: string;
    border: string;
    iconAccent: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    accent: "before:bg-emerald-500/30",
    border: "border-emerald-500/20",
    iconAccent: "text-emerald-500",
  },
  error: {
    icon: XCircle,
    accent: "before:bg-rose-500/30",
    border: "border-rose-500/20",
    iconAccent: "text-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    accent: "before:bg-amber-500/30",
    border: "border-amber-500/25",
    iconAccent: "text-amber-500",
  },
  info: {
    icon: Info,
    accent: "before:bg-sky-500/30",
    border: "border-sky-500/20",
    iconAccent: "text-sky-500",
  },
};

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const {
    icon: Icon,
    accent,
    border,
    iconAccent,
  } = variantStyles[toast.variant];
  const role =
    toast.variant === "error" || toast.variant === "warning"
      ? "alert"
      : "status";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsVisible(true);
      setShowBar(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const handleRemove = useCallback(() => {
    setIsVisible(false);
    setShowBar(false);
    const timeout = setTimeout(onRemove, 220);
    return () => clearTimeout(timeout);
  }, [onRemove]);

  return (
    <div className="pointer-events-auto" role={role} aria-live="assertive">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-white/90 p-4 shadow-2xl shadow-black/10 backdrop-blur transition-all duration-200 dark:border-white/10 dark:bg-slate-900/90",
          "before:absolute before:-left-12 before:top-1/2 before:h-32 before:w-32 before:-translate-y-1/2 before:rounded-full before:blur-3xl before:content-['']",
          accent,
          border,
          isVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        <div
          className={cn("flex items-start gap-3", toast.duration > 0 && "pb-4")}
        >
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-lg dark:bg-white/5",
              iconAccent
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex-1 text-sm text-slate-900 dark:text-slate-100">
            <p className="font-semibold tracking-tight">{toast.title}</p>
            {toast.description ? (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {toast.description}
              </p>
            ) : null}
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onRemove();
                }}
                className="mt-3 inline-flex items-center gap-1 rounded-full border border-transparent bg-slate-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
          {toast.dismissible ? (
            <button
              type="button"
              onClick={handleRemove}
              className="mt-1 ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-600 transition hover:bg-black/10 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
              aria-label="Close notification"
            >
              <span className="sr-only">Close</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        {toast.duration > 0 ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-3 h-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <span
              className="block h-full rounded-full bg-slate-900/70 transition-[width] ease-linear dark:bg-white/70"
              style={{
                width: showBar ? "0%" : "100%",
                transitionDuration: `${toast.duration}ms`,
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
