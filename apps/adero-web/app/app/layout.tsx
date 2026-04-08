import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { resolveAderoUser } from "@/lib/auth";
import { db, aderoNotifications } from "@raylak/db";
import type { AderoRole } from "@raylak/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    requester: "Requester",
    operator: "Operator",
    company: "Company",
    admin: "Admin",
  };
  return labels[role] ?? "Member";
}

function roleNavItems(role: AderoRole): { label: string; href: string }[] {
  switch (role) {
    case "requester":
      return [
        { label: "Dashboard", href: "/app/requester" },
        { label: "New Request", href: "/app/requester/request/new" },
        { label: "Notifications", href: "/app/notifications" },
      ];
    case "operator":
      return [
        { label: "Dashboard", href: "/app/operator" },
        { label: "Notifications", href: "/app/notifications" },
      ];
    case "company":
      return [
        { label: "Dashboard", href: "/app/company" },
        { label: "New Request", href: "/app/company/request/new" },
        { label: "Notifications", href: "/app/notifications" },
      ];
    case "admin":
      return [
        { label: "Dashboard", href: "/app" },
        { label: "Notifications", href: "/app/notifications" },
        { label: "Admin Panel", href: "/admin" },
      ];
    default:
      return [];
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const aderoUser = await resolveAderoUser();
  const role = (aderoUser?.role ?? "requester") as AderoRole;
  const navItems = roleNavItems(role);
  let unreadCount = 0;

  if (aderoUser) {
    const [row] = await db
      .select({ n: count() })
      .from(aderoNotifications)
      .where(
        and(
          eq(aderoNotifications.userId, aderoUser.id),
          isNull(aderoNotifications.readAt),
        ),
      );

    unreadCount = Number(row?.n ?? 0);
  }

  return (
    <div className="min-h-screen" style={{ background: "#0f172a", color: "#f1f5f9" }}>
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: "#0c1425", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <Link href="/app" className="flex shrink-0 items-center gap-2">
            <span
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: "#6366f1" }}
            >
              Adero
            </span>
          </Link>

          <nav className="flex items-center gap-5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {item.label}
                {item.href === "/app/notifications" && unreadCount > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: "rgba(99,102,241,0.2)",
                      color: "#c7d2fe",
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <span
              className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                borderColor: "rgba(99,102,241,0.3)",
                color: "#818cf8",
                background: "rgba(99,102,241,0.08)",
              }}
            >
              {roleLabel(role)}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
