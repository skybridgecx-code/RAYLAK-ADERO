import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, aderoNotifications } from "@raylak/db";
import { requireAderoUser } from "@/lib/auth";
import { markNotificationRead } from "./actions";

export const metadata: Metadata = {
  title: "Notifications - Adero",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

function fmtDatetime(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseMetadata(value: string | null): Record<string, string> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const entries = Object.entries(parsed).map(([key, field]) => [
      key,
      typeof field === "string" ? field : JSON.stringify(field),
    ]);
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

export default async function NotificationsPage() {
  const aderoUser = await requireAderoUser();

  const [notifications, unreadCountRows] = await Promise.all([
    db
      .select()
      .from(aderoNotifications)
      .where(eq(aderoNotifications.userId, aderoUser.id))
      .orderBy(desc(aderoNotifications.createdAt))
      .limit(200),
    db
      .select({ id: aderoNotifications.id })
      .from(aderoNotifications)
      .where(
        and(
          eq(aderoNotifications.userId, aderoUser.id),
          isNull(aderoNotifications.readAt),
        ),
      ),
  ]);

  const unreadCount = unreadCountRows.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Notifications
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            {unreadCount} unread · {notifications.length} total
          </p>
        </div>
        <Link
          href="/app"
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "#475569" }}
        >
          Back to app
        </Link>
      </div>

      {notifications.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-10 text-center"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p className="text-sm" style={{ color: "#64748b" }}>
            No notifications yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => {
            const metadata = parseMetadata(item.metadata);
            const isUnread = item.readAt === null;

            return (
              <div
                key={item.id}
                className="rounded-xl border p-4"
                style={{
                  borderColor: isUnread
                    ? "rgba(99,102,241,0.35)"
                    : "rgba(255,255,255,0.08)",
                  background: isUnread
                    ? "rgba(99,102,241,0.08)"
                    : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                        {item.title}
                      </p>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "#94a3b8",
                        }}
                      >
                        {item.type.replaceAll("_", " ")}
                      </span>
                      {isUnread && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            background: "rgba(99,102,241,0.16)",
                            color: "#c7d2fe",
                          }}
                        >
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: "#cbd5e1" }}>
                      {item.message}
                    </p>
                    <p className="text-xs" style={{ color: "#64748b" }}>
                      {fmtDatetime(item.createdAt)}
                    </p>

                    {metadata && Object.keys(metadata).length > 0 && (
                      <div className="pt-1 text-[11px]" style={{ color: "#64748b" }}>
                        {Object.entries(metadata).map(([key, value]) => (
                          <p key={key}>
                            {key}: {value}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUnread ? (
                    <form action={markNotificationRead}>
                      <input type="hidden" name="notificationId" value={item.id} />
                      <button
                        type="submit"
                        className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                        style={{
                          background: "rgba(99,102,241,0.16)",
                          color: "#a5b4fc",
                        }}
                      >
                        Mark read
                      </button>
                    </form>
                  ) : (
                    <p className="text-[11px]" style={{ color: "#475569" }}>
                      Read {fmtDatetime(item.readAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
