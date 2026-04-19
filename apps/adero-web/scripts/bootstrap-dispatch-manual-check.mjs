import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

const appRoot = path.resolve(process.cwd());

function parseEnvFile(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\""))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }
  return env;
}

function loadDatabaseUrl() {
  if (process.env["DATABASE_URL"]) {
    return process.env["DATABASE_URL"];
  }

  const candidateFiles = [".env.local", ".env"];
  for (const fileName of candidateFiles) {
    const filePath = path.join(appRoot, fileName);
    if (!fs.existsSync(filePath)) continue;
    const parsed = parseEnvFile(fs.readFileSync(filePath, "utf8"));
    if (parsed["DATABASE_URL"]) {
      return parsed["DATABASE_URL"];
    }
  }

  return null;
}

function envOrDefault(name, fallback) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) return fallback;
  return value.trim();
}

function buildClerkId(prefix) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${suffix}`;
}

const databaseUrl = loadDatabaseUrl();

if (!databaseUrl) {
  console.error("Missing DATABASE_URL. Set it in env or apps/adero-web/.env.local.");
  process.exit(1);
}

const requesterEmail = envOrDefault(
  "ADERO_LOCAL_REQUESTER_EMAIL",
  "phase15i-requester@local.adero",
);
const operatorEmail = envOrDefault(
  "ADERO_LOCAL_OPERATOR_EMAIL",
  "phase15i-operator@local.adero",
);

const sql = postgres(databaseUrl, { max: 1 });

try {
  const now = new Date();
  const pickupAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const result = await sql.begin(async (tx) => {
    let requesterId;
    const requesterRows = await tx`
      select id
      from adero_users
      where email = ${requesterEmail}
      order by created_at asc
      limit 1
    `;
    if (requesterRows.length > 0) {
      requesterId = requesterRows[0].id;
      await tx`
        update adero_users
        set role = 'requester', updated_at = now()
        where id = ${requesterId}
      `;
    } else {
      const inserted = await tx`
        insert into adero_users (clerk_id, email, role, created_at, updated_at)
        values (${buildClerkId("local_phase15i_requester")}, ${requesterEmail}, 'requester', now(), now())
        returning id
      `;
      requesterId = inserted[0].id;
    }

    let operatorId;
    const operatorRows = await tx`
      select id
      from adero_users
      where email = ${operatorEmail}
      order by created_at asc
      limit 1
    `;
    if (operatorRows.length > 0) {
      operatorId = operatorRows[0].id;
      await tx`
        update adero_users
        set role = 'operator', updated_at = now()
        where id = ${operatorId}
      `;
    } else {
      const inserted = await tx`
        insert into adero_users (clerk_id, email, role, created_at, updated_at)
        values (${buildClerkId("local_phase15i_operator")}, ${operatorEmail}, 'operator', now(), now())
        returning id
      `;
      operatorId = inserted[0].id;
    }

    await tx`
      insert into adero_operator_availability (user_id, availability_status, service_area, updated_at)
      values (${operatorId}, 'available', 'Local QA', now())
      on conflict (user_id)
      do update set
        availability_status = excluded.availability_status,
        service_area = excluded.service_area,
        updated_at = excluded.updated_at
    `;

    const requestRows = await tx`
      insert into adero_requests (
        requester_id,
        service_type,
        pickup_address,
        dropoff_address,
        pickup_at,
        passenger_count,
        notes,
        status,
        created_at,
        updated_at
      )
      values (
        ${requesterId},
        'sedan',
        '10 Local Dispatch Way',
        '200 Manual Offer Ave',
        ${pickupAt},
        1,
        'Phase 15I local manual-offer verification request',
        'submitted',
        now(),
        now()
      )
      returning id
    `;

    return {
      requesterId,
      operatorId,
      requestId: requestRows[0].id,
    };
  });

  console.log("Adero local manual verification bootstrap complete.");
  console.log(`Requester email: ${requesterEmail}`);
  console.log(`Operator email: ${operatorEmail}`);
  console.log(`Requester user id: ${result.requesterId}`);
  console.log(`Operator user id: ${result.operatorId}`);
  console.log(`Created submitted request id: ${result.requestId}`);
  console.log("Next steps:");
  console.log("1) Start app on a free port (for example: pnpm --filter @adero/web dev -- --port 3011)");
  console.log("2) Login at /admin/login using your local ADERO_ADMIN_SECRET");
  console.log("3) Open /admin/dispatch and create a manual offer for the created request/operator");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Bootstrap failed: ${message}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
