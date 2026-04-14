"use client";

import { useActionState, useRef } from "react";
import { addApplicationNote } from "./actions";

export function AddNoteForm({ type, id }: { type: "company" | "operator"; id: string }) {
  const [state, formAction, isPending] = useActionState(addApplicationNote, { error: null });
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    await formAction(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleAction} className="space-y-3">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />

      <div>
        <label
          htmlFor="note-actor"
          className="mb-2 block text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#64748b" }}
        >
          Your name
        </label>
        <input
          id="note-actor"
          name="actorName"
          type="text"
          placeholder="Optional — for audit history"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: "#1e293b",
            color: "#f1f5f9",
          }}
        />
      </div>

      <div>
        <label
          htmlFor="note-textarea"
          className="mb-2 block text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#64748b" }}
        >
          Add Note
        </label>
        <textarea
          id="note-textarea"
          name="note"
          rows={3}
          placeholder="Internal note…"
          className="w-full resize-y rounded-lg border px-3 py-2.5 text-sm outline-none"
          style={{
            borderColor: state.error ? "#ef4444" : "rgba(255,255,255,0.12)",
            background: "#1e293b",
            color: "#f1f5f9",
          }}
        />
        {state.error && (
          <p className="mt-1 text-xs" style={{ color: "#f87171" }}>
            {state.error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
        style={{ borderColor: "rgba(255,255,255,0.12)", color: "#94a3b8" }}
      >
        {isPending ? "Saving…" : "Save Note"}
      </button>
    </form>
  );
}
