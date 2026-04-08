import type { AderoMemberNote } from "@raylak/db";
import { AddNoteForm } from "./add-note-form";

function fmtTimestamp(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MemberNotesPanel({
  notes,
  memberType,
  profileId,
}: {
  notes: AderoMemberNote[];
  memberType: "company" | "operator";
  profileId: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2
          className="text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#475569" }}
        >
          Internal Notes
        </h2>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: "rgba(255,255,255,0.05)", color: "#334155" }}
        >
          Staff only · not visible to member
        </span>
      </div>

      {notes.length > 0 && (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border px-4 py-3 space-y-1.5"
              style={{
                borderColor: "rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#cbd5e1" }}>
                {note.body}
              </p>
              <p className="text-[11px]" style={{ color: "#334155" }}>
                {fmtTimestamp(note.createdAt)}
                {note.actorName ? ` · ${note.actorName}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <p className="text-sm" style={{ color: "#334155" }}>
          No internal notes yet.
        </p>
      )}

      <AddNoteForm memberType={memberType} profileId={profileId} />
    </section>
  );
}
