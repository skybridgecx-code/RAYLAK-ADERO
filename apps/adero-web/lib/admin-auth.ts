import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type SecretDistinctStatus = "yes" | "no" | "unknown";

export async function hasAderoAdminCookie(): Promise<boolean> {
  const secret = process.env["ADERO_ADMIN_SECRET"];
  const cookieStore = await cookies();
  const session = cookieStore.get("adero_admin")?.value;

  return Boolean(secret && session === secret);
}

export async function requireAderoAdminCookie(): Promise<void> {
  if (!(await hasAderoAdminCookie())) {
    throw new Error("Admin access required.");
  }
}

export async function requireAderoAdminPage(path: string): Promise<void> {
  if (!(await hasAderoAdminCookie())) {
    redirect(`/admin/login?from=${encodeURIComponent(path)}`);
  }
}

export function isAderoAdminSecretConfigured(): boolean {
  return Boolean(process.env["ADERO_ADMIN_SECRET"]);
}

export function getAderoAdminCronDistinctStatus(): SecretDistinctStatus {
  const adminSecret = process.env["ADERO_ADMIN_SECRET"];
  const cronSecret = process.env["ADERO_CRON_SECRET"];

  if (!adminSecret || !cronSecret) {
    return "unknown";
  }

  return adminSecret === cronSecret ? "no" : "yes";
}
