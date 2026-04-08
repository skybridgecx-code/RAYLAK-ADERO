import { NextResponse } from "next/server";
import {
  checkAndExpireQuotes,
  checkAndMarkOverdueInvoices,
} from "@/lib/payment-lifecycle";

export async function GET(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  const adminSecret = process.env["ADERO_ADMIN_SECRET"];

  if (!adminSecret || cronSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overdueInvoices = await checkAndMarkOverdueInvoices();
  const expiredQuotes = await checkAndExpireQuotes();

  return NextResponse.json({
    overdueInvoices,
    expiredQuotes,
    timestamp: new Date().toISOString(),
  });
}
