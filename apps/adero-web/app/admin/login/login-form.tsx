"use client";

import { useActionState } from "react";
import { adminLogin } from "./actions";

export function LoginForm({ from }: { from: string }) {
  const [state, formAction, isPending] = useActionState(adminLogin, { error: null });

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span
            className="text-base font-bold tracking-widest uppercase"
            style={{ color: "#6366f1" }}
          >
            Adero
          </span>
          <p className="text-xs mt-1 tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
            Internal Admin
          </p>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <h1 className="text-lg font-medium mb-1" style={{ color: "#f1f5f9" }}>
            Sign in
          </h1>
          <p className="text-sm mb-6" style={{ color: "#64748b" }}>
            Enter the admin password to access the review queue.
          </p>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="from" value={from} />
            <div>
              <label
                htmlFor="secret"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#94a3b8" }}
              >
                Password
              </label>
              <input
                id="secret"
                name="secret"
                type="password"
                autoFocus
                autoComplete="current-password"
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none"
                style={{
                  borderColor: state.error ? "#ef4444" : "rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#f1f5f9",
                }}
              />
              {state.error && (
                <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>
                  {state.error}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ background: "#6366f1", color: "#fff" }}
            >
              {isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
