"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { initiatePayment } from "@/app/app/requester/payments/actions";
import { getRequesterInvoicePayContext } from "./actions";

type InvoiceContext = {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: string;
    paidAmount: string;
    currency: string;
    dueDate: Date | string;
    createdAt: Date | string;
  };
  isPayable: boolean;
};

function formatMoney(value: string | number): string {
  const amount = Number(value);
  return `$${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RequesterInvoicePayPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params?.id;

  const [context, setContext] = useState<InvoiceContext | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializingPayment, setInitializingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const initAttemptedRef = useRef(false);

  const publishableKey = process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"];

  useEffect(() => {
    if (!invoiceId) {
      setError("Invalid invoice id.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setInfo(null);

        const payContext = await getRequesterInvoicePayContext(invoiceId);
        if (cancelled) return;

        setContext(payContext);

        if (!payContext.isPayable) {
          setInfo("This invoice is not payable in its current status.");
          return;
        }

        if (!publishableKey) {
          setInfo(
            "Online payments are not yet configured. Please contact support for payment instructions.",
          );
          return;
        }

        if (initAttemptedRef.current) {
          return;
        }

        initAttemptedRef.current = true;
        setInitializingPayment(true);
        const result = await initiatePayment(invoiceId);
        if (cancelled) return;

        setClientSecret(result.clientSecret);
        setInfo(
          "Payment initiated. Stripe Elements UI is unavailable in this build; complete payment through your configured support flow.",
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load payment page.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInitializingPayment(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [invoiceId, publishableKey]);

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          Loading payment details...
        </p>
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="space-y-4">
        <Link
          href={invoiceId ? `/app/requester/invoices/${invoiceId}` : "/app/requester/invoices"}
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "#475569" }}
        >
          ← Back to invoice
        </Link>
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.08)",
            color: "#fda4af",
          }}
        >
          {error ?? "Unable to load payment context."}
        </div>
      </div>
    );
  }

  const invoice = context.invoice;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={`/app/requester/invoices/${invoice.id}`}
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "#475569" }}
        >
          ← Back to invoice
        </Link>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Pay Invoice #{invoice.invoiceNumber}
        </h1>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Invoice Summary
        </p>
        <div className="mt-3 space-y-2 text-sm" style={{ color: "#cbd5e1" }}>
          <p>
            <span style={{ color: "#94a3b8" }}>Status:</span> {invoice.status}
          </p>
          <p>
            <span style={{ color: "#94a3b8" }}>Total:</span> {formatMoney(invoice.totalAmount)}
          </p>
          <p>
            <span style={{ color: "#94a3b8" }}>Paid:</span> {formatMoney(invoice.paidAmount)}
          </p>
          <p>
            <span style={{ color: "#94a3b8" }}>Due:</span> {formatDate(invoice.dueDate)}
          </p>
          <p>
            <span style={{ color: "#94a3b8" }}>Created:</span> {formatDate(invoice.createdAt)}
          </p>
        </div>
      </div>

      {initializingPayment && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(59,130,246,0.25)",
            background: "rgba(59,130,246,0.08)",
            color: "#93c5fd",
          }}
        >
          Initiating payment...
        </div>
      )}

      {info && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(99,102,241,0.25)",
            background: "rgba(99,102,241,0.08)",
            color: "#c7d2fe",
          }}
        >
          {info}
        </div>
      )}

      {clientSecret && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(148,163,184,0.2)",
            background: "rgba(15,23,42,0.5)",
            color: "#94a3b8",
          }}
        >
          Payment client secret generated: {clientSecret.slice(0, 16)}...
        </div>
      )}

      <p className="text-xs" style={{ color: "#64748b" }}>
        If payment status does not update immediately, refresh the invoice detail page in a moment.
      </p>
    </div>
  );
}
