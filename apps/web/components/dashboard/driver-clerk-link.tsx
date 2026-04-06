"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/lib/trpc/client";

interface Props {
  driverProfileId: string;
  currentClerkId: string | null | undefined;
}

export function DriverClerkLink({ driverProfileId, currentClerkId }: Props) {
  const router = useRouter();
  const [clerkId, setClerkId] = useState(currentClerkId ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setClerkIdMutation = trpc.driver.setClerkId.useMutation({
    onSuccess() {
      setSaved(true);
      setFormError(null);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    },
    onError(err) {
      setFormError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    setClerkIdMutation.mutate({ driverProfileId, clerkId: clerkId.trim() });
  }

  const isLinked = Boolean(currentClerkId);

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0c1830]">Clerk Account Link</h2>
        {isLinked ? (
          <span className="rounded border bg-teal-50 text-teal-700 border-teal-200 px-2 py-0.5 text-xs font-medium">
            Linked
          </span>
        ) : (
          <span className="rounded border bg-amber-50 text-amber-700 border-amber-200 px-2 py-0.5 text-xs font-medium">
            Not linked
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {isLinked
          ? "This driver has a Clerk account linked. The driver can sign in and use the driver app."
          : "This driver has no Clerk account linked. They cannot sign in until linked. The Clerk webhook links automatically when the driver signs up with the same email."}
      </p>

      {isLinked && (
        <p className="text-xs font-mono text-gray-400 break-all">{currentClerkId}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Clerk User ID
          </label>
          <input
            type="text"
            value={clerkId}
            onChange={(e) => setClerkId(e.target.value)}
            placeholder='user_xxxxxxxxxxxxxxxx  (leave blank to unlink)'
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#0c1830]/30"
          />
        </div>

        {formError && <p className="text-xs text-red-600">{formError}</p>}
        {saved && <p className="text-xs text-teal-600">Saved successfully.</p>}

        <button
          type="submit"
          disabled={setClerkIdMutation.isPending}
          className="rounded bg-[#0c1830] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0c1830]/85 disabled:opacity-50 transition-colors"
        >
          {setClerkIdMutation.isPending ? "Saving…" : "Save link"}
        </button>
      </form>
    </div>
  );
}
