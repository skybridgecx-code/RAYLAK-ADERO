import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
