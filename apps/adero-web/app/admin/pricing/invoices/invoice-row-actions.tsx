"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminCancelInvoice,
  adminMarkOverdue,
  adminRecordManualPayment,
  adminSendPaymentReminder,
} from "../actions";

export function InvoiceRowActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank_transfer" | "manual">("bank_transfer");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );

  const canCancel = status === "issued" || status === "overdue";
  const canMarkOverdue = status === "issued";
  const canSendReminder = status === "issued" || status === "overdue";
  const canRecordPayment =
    status !== "paid" && status !== "refunded" && status !== "canceled";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setFeedback(null);
              startTransition(async () => {
                try {
                  await adminCancelInvoice(invoiceId);
                  setFeedback({ type: "success", text: "Invoice canceled." });
                  router.refresh();
                } catch (error) {
                  setFeedback({
                    type: "error",
                    text:
                      error instanceof Error ? error.message : "Cancel failed.",
                  });
                }
              });
            }}
            className="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.2)", color: "#fda4af" }}
          >
            {isPending ? "Working…" : "Cancel"}
          </button>
        )}

        {canMarkOverdue && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setFeedback(null);
              startTransition(async () => {
                try {
                  await adminMarkOverdue(invoiceId);
                  setFeedback({ type: "success", text: "Marked overdue." });
                  router.refresh();
                } catch (error) {
                  setFeedback({
                    type: "error",
                    text:
                      error instanceof Error
                        ? error.message
                        : "Mark overdue failed.",
                  });
                }
              });
            }}
            className="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
            style={{ background: "rgba(234,179,8,0.2)", color: "#fde68a" }}
          >
            {isPending ? "Working…" : "Mark Overdue"}
          </button>
        )}

        {canSendReminder && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setFeedback(null);
              startTransition(async () => {
                try {
                  await adminSendPaymentReminder(invoiceId);
                  setFeedback({ type: "success", text: "Reminder sent." });
                } catch (error) {
                  setFeedback({
                    type: "error",
                    text:
                      error instanceof Error
                        ? error.message
                        : "Send reminder failed.",
                  });
                }
              });
            }}
            className="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
            style={{ background: "rgba(56,189,248,0.2)", color: "#7dd3fc" }}
          >
            {isPending ? "Working…" : "Send Reminder"}
          </button>
        )}

        {canRecordPayment && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setShowPaymentForm((prev) => !prev);
              setFeedback(null);
            }}
            className="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
            style={{ background: "rgba(99,102,241,0.2)", color: "#c7d2fe" }}
          >
            {showPaymentForm ? "Close Payment Form" : "Record Payment"}
          </button>
        )}
      </div>

      {showPaymentForm && canRecordPayment && (
        <form
          className="grid gap-2 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            setFeedback(null);

            const formData = new FormData();
            formData.set("invoiceId", invoiceId);
            formData.set("amount", amount);
            formData.set("method", method);
            if (note.trim().length > 0) {
              formData.set("note", note.trim());
            }

            startTransition(async () => {
              try {
                await adminRecordManualPayment(formData);
                setFeedback({ type: "success", text: "Payment recorded." });
                setAmount("");
                setNote("");
                setShowPaymentForm(false);
                router.refresh();
              } catch (error) {
                setFeedback({
                  type: "error",
                  text:
                    error instanceof Error
                      ? error.message
                      : "Record payment failed.",
                });
              }
            });
          }}
        >
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <input
            required
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount"
            className="rounded-md border px-2 py-1 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
          <select
            name="method"
            value={method}
            onChange={(event) => setMethod(event.target.value as "bank_transfer" | "manual")}
            className="rounded-md border px-2 py-1 text-xs outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          >
            <option value="bank_transfer">bank_transfer</option>
            <option value="manual">manual</option>
          </select>
          <input
            name="note"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note (optional)"
            className="rounded-md border px-2 py-1 text-xs outline-none sm:col-span-2"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "#0f172a",
              color: "#e2e8f0",
            }}
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 sm:col-span-4 sm:w-fit"
            style={{ background: "rgba(34,197,94,0.2)", color: "#86efac" }}
          >
            {isPending ? "Saving…" : "Save Payment"}
          </button>
        </form>
      )}

      {feedback && (
        <p
          className="text-[11px]"
          style={{ color: feedback.type === "error" ? "#fda4af" : "#86efac" }}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
