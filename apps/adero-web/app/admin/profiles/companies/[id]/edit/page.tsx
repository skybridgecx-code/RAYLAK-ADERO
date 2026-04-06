import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { aderoCompanyProfiles, db } from "@raylak/db";
import { eq } from "drizzle-orm";
import { ProfileShell } from "../../../profile-parts";
import { CompanyProfileEditForm } from "../../company-profile-edit-form";

export const metadata: Metadata = {
  title: "Edit Company Profile - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function EditCompanyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile] = await db
    .select()
    .from(aderoCompanyProfiles)
    .where(eq(aderoCompanyProfiles.id, id));

  if (!profile) notFound();

  return (
    <ProfileShell
      backHref={`/admin/profiles/companies/${profile.id}`}
      backLabel="<- Company profile"
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Edit {profile.companyName}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#475569" }}>
            Maintain the internal Adero company member record.
          </p>
        </div>

        <Link
          href={`/admin/company/${profile.applicationId}`}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
        >
          Source application
        </Link>
      </div>

      <CompanyProfileEditForm profile={profile} />
    </ProfileShell>
  );
}
