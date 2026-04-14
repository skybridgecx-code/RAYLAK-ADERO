import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { aderoOperatorProfiles, db } from "@raylak/db";
import { eq } from "drizzle-orm";
import { ProfileShell } from "../../../profile-parts";
import { OperatorProfileEditForm } from "../../operator-profile-edit-form";

export const metadata: Metadata = {
  title: "Edit Operator Profile - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function EditOperatorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile] = await db
    .select()
    .from(aderoOperatorProfiles)
    .where(eq(aderoOperatorProfiles.id, id));

  if (!profile) notFound();

  return (
    <ProfileShell
      backHref={`/admin/profiles/operators/${profile.id}`}
      backLabel="<- Operator profile"
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Edit {profile.fullName}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#475569" }}>
            Maintain the internal Adero operator member record.
          </p>
        </div>

        <Link
          href={`/admin/operator/${profile.applicationId}`}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "rgba(20,184,166,0.12)", color: "#2dd4bf" }}
        >
          Source application
        </Link>
      </div>

      <OperatorProfileEditForm profile={profile} />
    </ProfileShell>
  );
}
