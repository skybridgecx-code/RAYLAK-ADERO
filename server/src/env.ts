import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  // Allowed CORS origin — should be the Next.js web app URL
  WEB_APP_URL: z.string().url().default("http://localhost:3000"),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error("[env] Missing or invalid environment variables:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
