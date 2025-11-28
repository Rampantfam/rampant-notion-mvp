"use client";

import { useEffect, useRef } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();

    const handler = (e: MouseEvent) => {
      if (!dlg) return;
      const rect = dlg.getBoundingClientRect();
      const clickInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!clickInside) onClose();
    };
    dlg.addEventListener("click", handler);
    return () => dlg.removeEventListener("click", handler);
  }, [open, onClose]);

  return (
    <dialog
      ref={ref}
      className="rounded-xl backdrop:bg-black/40 p-0 max-w-lg w-[92%]"
      onClose={onClose}
    >
      <div className="p-4 sm:p-6">
        {title ? <h3 className="text-lg font-semibold mb-3">{title}</h3> : null}
        {children}
      </div>
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <button
          onClick={onClose}
          className="text-sm px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
