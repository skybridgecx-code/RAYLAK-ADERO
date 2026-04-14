import { requireAderoUser } from "@/lib/auth";

export default async function RequesterLayout({ children }: { children: React.ReactNode }) {
  await requireAderoUser();
  return <>{children}</>;
}
