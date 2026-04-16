import { NextResponse } from "next/server";
import { aderoCompanyProfiles, aderoOperatorProfiles, db } from "@raylak/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ALLOWED_CONTENT_TYPES, createPresignedPut, isStorageConfigured } from "~/lib/s3";

const QuerySchema = z.object({
  token: z.string().uuid(),
  contentType: z.string().min(1),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const result = QuerySchema.safeParse({
    token: searchParams.get("token"),
    contentType: searchParams.get("contentType"),
  });

  if (!result.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { token, contentType } = result.data;

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "File type not allowed. Use PDF, JPEG, PNG, WEBP, DOC, or DOCX." },
      { status: 415 },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "File uploads are not configured." },
      { status: 503 },
    );
  }

  // Resolve member from token
  const [companyRow, operatorRow] = await Promise.all([
    db
      .select({ id: aderoCompanyProfiles.id, portalTokenExpiresAt: aderoCompanyProfiles.portalTokenExpiresAt })
      .from(aderoCompanyProfiles)
      .where(eq(aderoCompanyProfiles.portalToken, token))
      .limit(1),
    db
      .select({ id: aderoOperatorProfiles.id, portalTokenExpiresAt: aderoOperatorProfiles.portalTokenExpiresAt })
      .from(aderoOperatorProfiles)
      .where(eq(aderoOperatorProfiles.portalToken, token))
      .limit(1),
  ]);

  const companyProfile = companyRow[0] ?? null;
  const operatorProfile = operatorRow[0] ?? null;

  if (!companyProfile && !operatorProfile) {
    return NextResponse.json({ error: "Invalid portal token." }, { status: 403 });
  }

  // Reject expired tokens
  const expiresAt = companyProfile?.portalTokenExpiresAt ?? operatorProfile?.portalTokenExpiresAt ?? null;
  if (expiresAt && expiresAt <= new Date()) {
    return NextResponse.json({ error: "This portal link has expired." }, { status: 403 });
  }

  const memberType: "company" | "operator" = companyProfile ? "company" : "operator";
  const profileId = companyProfile ? companyProfile.id : operatorProfile!.id;

  try {
    const { uploadUrl, fileKey } = await createPresignedPut({
      memberType,
      profileId,
      contentType,
    });

    return NextResponse.json({ uploadUrl, fileKey });
  } catch (err) {
    console.error("[adero] presign failed:", err);
    return NextResponse.json({ error: "Could not generate upload URL." }, { status: 500 });
  }
}
