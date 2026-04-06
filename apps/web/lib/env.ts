import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Environment variable validation.
 * The app will throw at startup if required variables are missing or malformed.
 * Add variables here as they become needed in each phase.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().min(1),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Phase 2 — email + Clerk webhook
    RESEND_API_KEY: z.string().min(1).optional(),
    CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),

    // Reserved — uncomment when integrating
    // TWILIO_ACCOUNT_SID: z.string().min(1),
    // TWILIO_AUTH_TOKEN: z.string().min(1),
    // TWILIO_PHONE_NUMBER: z.string().min(1),
    // STRIPE_SECRET_KEY: z.string().min(1),
    // STRIPE_WEBHOOK_SECRET: z.string().min(1),
    // AWS_ACCESS_KEY_ID: z.string().min(1),
    // AWS_SECRET_ACCESS_KEY: z.string().min(1),
    // AWS_S3_BUCKET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),

    // Reserved
    // NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1),
    // NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
    // NEXT_PUBLIC_SENTRY_DSN: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env["DATABASE_URL"],
    REDIS_URL: process.env["REDIS_URL"],
    CLERK_SECRET_KEY: process.env["CLERK_SECRET_KEY"],
    NODE_ENV: process.env["NODE_ENV"],
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
    CLERK_WEBHOOK_SECRET: process.env["CLERK_WEBHOOK_SECRET"],
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
    NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
  },
  skipValidation: process.env["SKIP_ENV_VALIDATION"] === "1",
  emptyStringAsUndefined: true,
});
