"use client";

import {
  cloneElement,
  isValidElement,
  useState,
  useTransition,
  type ReactElement,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  approveQuoteAction,
  rejectQuoteAction,
} from "@/app/app/requester/quotes/actions";

type QuoteActionsChildProps = {
  onApprove?: () => void | Promise<void>;
  onReject?: () => void | Promise<void>;
  showActions?: boolean;
  isPending?: boolean;
  pendingAction?: "approve" | "reject" | null;
};

type QuoteActionsProps = {
  quoteId: string;
  children?: ReactNode;
};

export function QuoteActions({ quoteId, children }: QuoteActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const runApprove = () => {
    setError(null);
    setSuccess(null);
    setPendingAction("approve");

    startTransition(async () => {
      try {
        const result = await approveQuoteAction(quoteId);
        if (result.success) {
          setSuccess("Quote approved.");
          router.refresh();
          return;
        }
        setError("Quote approval failed.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Quote approval failed.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const runReject = () => {
    setError(null);
    setSuccess(null);
    setPendingAction("reject");

    startTransition(async () => {
      try {
        const result = await rejectQuoteAction(quoteId);
        if (result.success) {
          setSuccess("Quote declined.");
          router.refresh();
          return;
        }
        setError("Quote decline failed.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Quote decline failed.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  let content: ReactNode = children;
  if (isValidElement(children)) {
    const child = children as ReactElement<QuoteActionsChildProps>;
    content = cloneElement(child, {
      onApprove: runApprove,
      onReject: runReject,
      showActions: true,
      isPending,
      pendingAction,
    });
  }

  return (
    <div className="space-y-2">
      {content ?? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runApprove}
            disabled={isPending}
            className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "rgba(34,197,94,0.2)", color: "#86efac" }}
          >
            {isPending && pendingAction === "approve" ? "Approving…" : "Approve Quote"}
          </button>
          <button
            type="button"
            onClick={runReject}
            disabled={isPending}
            className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.2)", color: "#fda4af" }}
          >
            {isPending && pendingAction === "reject" ? "Declining…" : "Decline Quote"}
          </button>
        </div>
      )}

      {success && (
        <p className="text-xs" style={{ color: "#86efac" }}>
          {success}
        </p>
      )}

      {error && (
        <p className="text-xs" style={{ color: "#fda4af" }}>
          {error}
        </p>
      )}
    </div>
  );
}
