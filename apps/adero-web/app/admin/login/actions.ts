"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function adminLogin(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const secret = process.env["ADERO_ADMIN_SECRET"];
  const entered = String(formData.get("secret") ?? "");

  if (!secret) {
    return { error: "Admin access is not configured on this server." };
  }

  if (entered !== secret) {
    return { error: "Incorrect password." };
  }

  const cookieStore = await cookies();
  cookieStore.set("adero_admin", secret, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  const from = String(formData.get("from") ?? "/admin");
  redirect(from.startsWith("/admin") && !from.startsWith("/admin/login") ? from : "/admin");
}
