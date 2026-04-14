import { redirect } from "next/navigation";
import { resolveAderoUser } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adero App",
  robots: { index: false },
};

export default async function AppEntryPage() {
  const aderoUser = await resolveAderoUser();

  if (!aderoUser) {
    redirect("/auth/sign-in");
  }

  switch (aderoUser.role) {
    case "company":
      redirect("/app/company");
      break;
    case "operator":
      redirect("/app/operator");
      break;
    case "admin":
      redirect("/app/requester");
      break;
    case "requester":
    default:
      redirect("/app/requester");
      break;
  }
}
