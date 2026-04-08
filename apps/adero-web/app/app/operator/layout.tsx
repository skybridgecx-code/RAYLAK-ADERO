import { requireAderoUser } from "@/lib/auth";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  await requireAderoUser();
  return <>{children}</>;
}
