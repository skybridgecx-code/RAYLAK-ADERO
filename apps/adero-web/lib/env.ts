import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_REGION: z.string().min(1).default("us-east-1"),
    AWS_S3_BUCKET: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1).optional(),
    ADERO_FROM_EMAIL: z.string().min(1).optional(),
    ADERO_BASE_URL: z.string().url().optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_CONNECT_WEBHOOK_SECRET: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env["DATABASE_URL"],
    AWS_ACCESS_KEY_ID: process.env["AWS_ACCESS_KEY_ID"],
    AWS_SECRET_ACCESS_KEY: process.env["AWS_SECRET_ACCESS_KEY"],
    AWS_REGION: process.env["AWS_REGION"],
    AWS_S3_BUCKET: process.env["AWS_S3_BUCKET"],
    CLERK_SECRET_KEY: process.env["CLERK_SECRET_KEY"],
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
    ADERO_FROM_EMAIL: process.env["ADERO_FROM_EMAIL"],
    ADERO_BASE_URL: process.env["ADERO_BASE_URL"],
    STRIPE_SECRET_KEY: process.env["STRIPE_SECRET_KEY"],
    STRIPE_WEBHOOK_SECRET: process.env["STRIPE_WEBHOOK_SECRET"],
    STRIPE_CONNECT_WEBHOOK_SECRET: process.env["STRIPE_CONNECT_WEBHOOK_SECRET"],
  },
  skipValidation: process.env["SKIP_ENV_VALIDATION"] === "1",
  emptyStringAsUndefined: true,
});
