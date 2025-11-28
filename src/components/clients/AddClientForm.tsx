"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = { onClose?: () => void };

export default function AddClientForm({ onClose }: Props) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Client name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          logo_url: logoUrl.trim() || null,
        }),
      });

      const text = await res.text();
      let json: any;
      try { json = text ? JSON.parse(text) : {}; } catch { json = { error: text }; }

      console.log("[AddClientForm] status:", res.status, "body:", json);

      if (!res.ok) {
        setError(json?.error ?? `Request failed with status ${res.status}`);
        setSubmitting(false);
        return;
      }

      const clientId = json?.client?.id;
      if (!clientId) {
        setError("Unexpected API response: missing client id.");
        setSubmitting(false);
        return;
      }

      onClose?.();
      router.refresh();
      setName("");
      setEmail("");
      setPhone("");
      setLogoUrl("");
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm font-medium">Client Name</label>
        <input className="w-full rounded-md border px-3 py-2"
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Innovate Group" />
      </div>

      <div>
        <label className="text-sm font-medium">Email</label>
        <input className="w-full rounded-md border px-3 py-2"
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@client.com" />
      </div>

      <div>
        <label className="text-sm font-medium">Phone</label>
        <input className="w-full rounded-md border px-3 py-2"
          value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
      </div>

      <div>
        <label className="text-sm font-medium">Logo URL</label>
        <input className="w-full rounded-md border px-3 py-2"
          value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} disabled={submitting}
          className="rounded-md border px-3 py-2 text-sm">Cancel</button>
        <button type="submit" disabled={submitting}
          className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}
