"use client";

import { AlertCircle, CheckCircle, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({
  message,
  type = "success",
  duration = 3000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    info: <AlertCircle className="h-5 w-5 text-blue-500" />,
  };

  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  };

  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300",
        bgColors[type],
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      {icons[type]}
      <span className="font-medium text-slate-700 text-sm">{message}</span>
      <button
        className="text-slate-400 hover:text-slate-600"
        onClick={handleClose}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: ToastType }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          onClose={() => onRemove(toast.id)}
          type={toast.type}
        />
      ))}
    </div>
  );
}

let toastId = 0;

export function showToast(
  setToasts: React.Dispatch<
    React.SetStateAction<
      Array<{ id: string; message: string; type?: ToastType }>
    >
  >,
  message: string,
  type: ToastType = "success"
) {
  const id = `toast-${toastId++}`;
  setToasts((prev) => [...prev, { id, message, type }]);
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 3000);
}
