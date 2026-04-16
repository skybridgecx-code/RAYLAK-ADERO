import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

// ─── Client (lazy singleton) ──────────────────────────────────────────────────

let _client: S3Client | null = null;

export const STORAGE_NOT_CONFIGURED_MESSAGE = "File storage is not configured.";

class StorageNotConfiguredError extends Error {
  constructor() {
    super(STORAGE_NOT_CONFIGURED_MESSAGE);
    this.name = "StorageNotConfiguredError";
  }
}

function getStorageConfig() {
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const region = env.AWS_REGION;
  const bucket = env.AWS_S3_BUCKET;

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    return null;
  }

  return { accessKeyId, secretAccessKey, region, bucket };
}

export function isStorageConfigured(): boolean {
  return getStorageConfig() !== null;
}

function getStorageConfigOrThrow() {
  const storageConfig = getStorageConfig();
  if (!storageConfig) {
    throw new StorageNotConfiguredError();
  }
  return storageConfig;
}

function getClient(storageConfig: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: storageConfig.region,
      credentials: {
        accessKeyId: storageConfig.accessKeyId,
        secretAccessKey: storageConfig.secretAccessKey,
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
  const storageConfig = getStorageConfigOrThrow();

  const command = new PutObjectCommand({
    Bucket: storageConfig.bucket,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getClient(storageConfig), command, { expiresIn: 300 }); // 5 minutes
  return { uploadUrl, fileKey };
}

// ─── Presigned GET (download) ─────────────────────────────────────────────────

export async function createPresignedGet(fileKey: string): Promise<string> {
  const storageConfig = getStorageConfigOrThrow();
  const command = new GetObjectCommand({
    Bucket: storageConfig.bucket,
    Key: fileKey,
  });
  return getSignedUrl(getClient(storageConfig), command, { expiresIn: 3600 }); // 1 hour
}
