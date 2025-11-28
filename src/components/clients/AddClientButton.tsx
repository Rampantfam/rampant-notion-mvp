"use client";

import * as React from "react";
import AddClientForm from "./AddClientForm";

export default function AddClientButton() {
  const ref = React.useRef<HTMLDialogElement>(null);
  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();

  return (
    <>
      <button onClick={open}
        className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white">
        + Add Client
      </button>

      <dialog ref={ref} className="rounded-xl p-0 backdrop:bg-black/30">
        <div className="w-[520px] max-w-[92vw] rounded-xl bg-white p-5">
          <div className="mb-3 text-base font-semibold">Add Client</div>
          <AddClientForm onClose={close} />
          <div className="mt-3">
            <button onClick={close} className="rounded-md border px-3 py-2 text-sm">
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
