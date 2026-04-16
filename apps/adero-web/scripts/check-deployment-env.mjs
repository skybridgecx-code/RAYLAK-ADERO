import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "../..");
const checklistPath = path.join(
  repoRoot,
  "docs/ADERO_DEPLOYMENT_ENV_CHECKLIST.md",
);
const envExamplePath = path.join(repoRoot, ".env.example");
const envSchemaPath = path.join(repoRoot, "apps/adero-web/lib/env.ts");
const cronRoutePath = path.join(
  repoRoot,
  "apps/adero-web/app/api/cron/payment-lifecycle/route.ts",
);

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

const failures = [];

const checklist = readIfExists(checklistPath);
if (!checklist) {
  failures.push("Missing docs/ADERO_DEPLOYMENT_ENV_CHECKLIST.md");
}

const envExample = readIfExists(envExamplePath);
if (!envExample) {
  failures.push("Missing .env.example");
} else {
  if (!envExample.includes("ADERO_ADMIN_SECRET")) {
    failures.push(".env.example is missing ADERO_ADMIN_SECRET");
  }
  if (!envExample.includes("ADERO_CRON_SECRET")) {
    failures.push(".env.example is missing ADERO_CRON_SECRET");
  }
}

const envSchema = readIfExists(envSchemaPath);
if (!envSchema) {
  failures.push("Missing apps/adero-web/lib/env.ts");
} else if (!envSchema.includes("ADERO_CRON_SECRET")) {
  failures.push("apps/adero-web/lib/env.ts is missing ADERO_CRON_SECRET");
}

const cronRoute = readIfExists(cronRoutePath);
if (!cronRoute) {
  failures.push("Missing apps/adero-web/app/api/cron/payment-lifecycle/route.ts");
} else {
  if (!cronRoute.includes('process.env["ADERO_CRON_SECRET"]')) {
    failures.push(
      "payment lifecycle cron route must use process.env[\"ADERO_CRON_SECRET\"]",
    );
  }
  if (!cronRoute.includes('request.headers.get("x-cron-secret")')) {
    failures.push(
      "payment lifecycle cron route must use request.headers.get(\"x-cron-secret\")",
    );
  }
  if (cronRoute.includes('process.env["ADERO_ADMIN_SECRET"]')) {
    failures.push("payment lifecycle cron route must not use ADERO_ADMIN_SECRET");
  }
}

if (checklist) {
  const normalized = checklist.toLowerCase();
  if (!normalized.includes("x-cron-secret")) {
    failures.push("deployment checklist doc must mention x-cron-secret");
  }
  if (!normalized.includes("pnpm validate")) {
    failures.push("deployment checklist doc must mention pnpm validate");
  }
  const mentionsNoReuseWarning =
    normalized.includes("reuse") &&
    normalized.includes("adero_admin_secret") &&
    normalized.includes("adero_cron_secret");
  if (!mentionsNoReuseWarning) {
    failures.push(
      "deployment checklist doc must warn against reusing ADERO_ADMIN_SECRET as ADERO_CRON_SECRET",
    );
  }
}

if (failures.length > 0) {
  console.error("Adero deployment env smoke check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Adero deployment env smoke check passed.");
