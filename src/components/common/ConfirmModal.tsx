"use client";

import { useEffect } from "react";

export default function ConfirmModal({
  open,
  title,
  description,
  onClose,
  children,
  primaryText = "Save",
  onPrimary,
  secondaryText = "Cancel",
  loading = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: React.ReactNode;
  primaryText?: string;
  onPrimary?: () => void;
  secondaryText?: string;
  loading?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="space-y-5">
          <div>
            <div className="text-lg font-semibold text-black">{title}</div>
            {description && <div className="text-sm text-gray-500 mt-1">{description}</div>}
          </div>
          <div className="space-y-4">{children}</div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {secondaryText}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onPrimary}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {loading ? "Saving…" : primaryText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
