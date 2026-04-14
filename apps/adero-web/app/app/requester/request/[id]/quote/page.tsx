import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { aderoQuotes, aderoRequests, db } from "@raylak/db";
import { requireAderoUser } from "@/lib/auth";
import { QuoteActions } from "@/components/quote-actions";
import { QuoteCard } from "@/components/quote-card";

export const metadata: Metadata = {
  title: "Request Quote - Adero",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function RequestQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const aderoUser = await requireAderoUser().catch(() => notFound());

  const [request] = await db
    .select({
      id: aderoRequests.id,
      requesterId: aderoRequests.requesterId,
      serviceType: aderoRequests.serviceType,
      pickupAddress: aderoRequests.pickupAddress,
      dropoffAddress: aderoRequests.dropoffAddress,
      pickupAt: aderoRequests.pickupAt,
      status: aderoRequests.status,
      createdAt: aderoRequests.createdAt,
    })
    .from(aderoRequests)
    .where(eq(aderoRequests.id, id))
    .limit(1);

  if (!request) {
    notFound();
  }

  if (request.requesterId !== aderoUser.id) {
    notFound();
  }

  const quotes = await db
    .select()
    .from(aderoQuotes)
    .where(eq(aderoQuotes.requestId, request.id))
    .orderBy(desc(aderoQuotes.createdAt));

  const latestActionableId =
    quotes.find((quote) => quote.status === "sent" || quote.status === "draft")?.id ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/app/requester"
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "#475569" }}
        >
          ← Back to requester dashboard
        </Link>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Quote for Request #{request.id.slice(0, 8)}
        </h1>
        <p className="text-sm" style={{ color: "#64748b" }}>
          {request.pickupAddress}
          <span style={{ color: "#475569" }}> → </span>
          {request.dropoffAddress}
        </p>
      </div>

      {quotes.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-6"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            No quote available yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => {
            if (quote.id === latestActionableId) {
              return (
                <QuoteActions key={quote.id} quoteId={quote.id}>
                  <QuoteCard quote={quote} showActions />
                </QuoteActions>
              );
            }

            return <QuoteCard key={quote.id} quote={quote} />;
          })}
        </div>
      )}
    </div>
  );
}
