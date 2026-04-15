import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "../..");
const adminRoot = path.join(repoRoot, "apps/adero-web/app/admin");
const helperPath = path.join(repoRoot, "apps/adero-web/lib/admin-auth.ts");
const cronRoutePath = path.join(
  repoRoot,
  "apps/adero-web/app/api/cron/payment-lifecycle/route.ts",
);

const allowedDirectFiles = new Set([
  path.join(repoRoot, "apps/adero-web/app/admin/login/actions.ts"),
]);

const requiredHelperExports = [
  "hasAderoAdminCookie",
  "requireAderoAdminCookie",
  "requireAderoAdminPage",
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(file) {
  return path.relative(repoRoot, file);
}

const failures = [];

if (!fs.existsSync(helperPath)) {
  failures.push("Missing apps/adero-web/lib/admin-auth.ts");
} else {
  const helper = fs.readFileSync(helperPath, "utf8");
  for (const exportedName of requiredHelperExports) {
    if (!helper.includes(`export async function ${exportedName}`)) {
      failures.push(`admin-auth helper is missing export: ${exportedName}`);
    }
  }
}

if (!fs.existsSync(cronRoutePath)) {
  failures.push("Missing apps/adero-web/app/api/cron/payment-lifecycle/route.ts");
} else {
  const cronRoute = fs.readFileSync(cronRoutePath, "utf8");

  if (cronRoute.includes('process.env["ADERO_ADMIN_SECRET"]')) {
    failures.push(`${relative(cronRoutePath)} must not use ADERO_ADMIN_SECRET`);
  }

  if (!cronRoute.includes('process.env["ADERO_CRON_SECRET"]')) {
    failures.push(`${relative(cronRoutePath)} must read ADERO_CRON_SECRET`);
  }

  if (!cronRoute.includes('request.headers.get("x-cron-secret")')) {
    failures.push(`${relative(cronRoutePath)} changed cron auth header from x-cron-secret`);
  }
}

for (const file of walk(adminRoot)) {
  if (allowedDirectFiles.has(file)) {
    continue;
  }

  const text = fs.readFileSync(file, "utf8");

  if (text.includes('process.env["ADERO_ADMIN_SECRET"]')) {
    failures.push(`${relative(file)} directly reads ADERO_ADMIN_SECRET`);
  }

  if (text.includes('cookieStore.get("adero_admin")')) {
    failures.push(`${relative(file)} directly reads adero_admin cookie`);
  }

  if (text.includes("requireAderoRole")) {
    failures.push(`${relative(file)} uses Clerk role auth inside /admin`);
  }
}

if (failures.length > 0) {
  console.error("Adero admin auth regression check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Adero admin auth regression check passed.");
