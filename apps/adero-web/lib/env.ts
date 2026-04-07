import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_REGION: z.string().min(1).default("us-east-1"),
    AWS_S3_BUCKET: z.string().min(1),
    // Email delivery via Resend. Optional — sends are skipped when unset.
    RESEND_API_KEY: z.string().min(1).optional(),
    // From address for Adero portal emails. e.g. "Adero <portal@adero.network>"
    ADERO_FROM_EMAIL: z.string().min(1).optional(),
    // Public base URL used to build portal links in emails.
    ADERO_BASE_URL: z.string().url().optional(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env["DATABASE_URL"],
    AWS_ACCESS_KEY_ID: process.env["AWS_ACCESS_KEY_ID"],
    AWS_SECRET_ACCESS_KEY: process.env["AWS_SECRET_ACCESS_KEY"],
    AWS_REGION: process.env["AWS_REGION"],
    AWS_S3_BUCKET: process.env["AWS_S3_BUCKET"],
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
    ADERO_FROM_EMAIL: process.env["ADERO_FROM_EMAIL"],
    ADERO_BASE_URL: process.env["ADERO_BASE_URL"],
  },
  skipValidation: process.env["SKIP_ENV_VALIDATION"] === "1",
  emptyStringAsUndefined: true,
});
