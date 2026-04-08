import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign Up",
  robots: { index: false },
};

export default function AderoSignUpPage() {
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
          <p
            className="text-xs mt-1 tracking-wider uppercase"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Create your account
          </p>
        </div>
        <div className="flex justify-center">
          <SignUp
            routing="path"
            path="/auth/sign-up"
            signInUrl="/auth/sign-in"
            forceRedirectUrl="/app"
          />
        </div>
      </div>
    </div>
  );
}
