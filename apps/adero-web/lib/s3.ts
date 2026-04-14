import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

// ─── Client (lazy singleton) ──────────────────────────────────────────────────

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

// ─── Allowed MIME types for portal submissions ────────────────────────────────

export const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function extFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  return map[contentType] ?? "bin";
}

// ─── Presigned PUT (upload) ───────────────────────────────────────────────────

export async function createPresignedPut({
  memberType,
  profileId,
  contentType,
}: {
  memberType: "company" | "operator";
  profileId: string;
  contentType: string;
}): Promise<{ uploadUrl: string; fileKey: string }> {
  const { randomUUID } = await import("crypto");
  const ext = extFromContentType(contentType);
  const fileKey = `adero/portal-submissions/${memberType}/${profileId}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: 300 }); // 5 minutes
  return { uploadUrl, fileKey };
}

// ─── Presigned GET (download) ─────────────────────────────────────────────────

export async function createPresignedGet(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: fileKey,
  });
  return getSignedUrl(getClient(), command, { expiresIn: 3600 }); // 1 hour
}
