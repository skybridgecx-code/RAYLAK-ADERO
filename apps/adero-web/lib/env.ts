import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_REGION: z.string().min(1).default("us-east-1"),
    AWS_S3_BUCKET: z.string().min(1),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env["DATABASE_URL"],
    AWS_ACCESS_KEY_ID: process.env["AWS_ACCESS_KEY_ID"],
    AWS_SECRET_ACCESS_KEY: process.env["AWS_SECRET_ACCESS_KEY"],
    AWS_REGION: process.env["AWS_REGION"],
    AWS_S3_BUCKET: process.env["AWS_S3_BUCKET"],
  },
  skipValidation: process.env["SKIP_ENV_VALIDATION"] === "1",
  emptyStringAsUndefined: true,
});
