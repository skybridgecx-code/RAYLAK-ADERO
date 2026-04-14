import { requireAderoUser } from "@/lib/auth";

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  await requireAderoUser();
  return <>{children}</>;
}
