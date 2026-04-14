"use client";

import { useActionState, useEffect, useRef } from "react";
import { addMemberNote, type NoteActionState } from "./note-actions";

const initialState: NoteActionState = { error: null, saved: false };

export function AddNoteForm({
  memberType,
  profileId,
}: {
  memberType: "company" | "operator";
  profileId: string;
}) {
  const [state, action, isPending] = useActionState(addMemberNote, initialState);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.saved && textareaRef.current) {
      textareaRef.current.value = "";
    }
  }, [state.saved]);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="memberType" value={memberType} />
      <input type="hidden" name="profileId" value={profileId} />

      <textarea
        ref={textareaRef}
        name="body"
        rows={3}
        maxLength={2000}
        placeholder="Add an internal note…"
        required
        className="w-full resize-none rounded-lg border px-3 py-2.5 text-xs outline-none"
        style={{
          borderColor: "rgba(255,255,255,0.1)",
          background: "#0f172a",
          color: "#e2e8f0",
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
          style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
        >
          {isPending ? "Saving…" : "Add note"}
        </button>

        {state.saved && (
          <span className="text-xs" style={{ color: "#4ade80" }}>
            Note saved.
          </span>
        )}

        {state.error && (
          <span className="text-xs" style={{ color: "#f87171" }}>
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
