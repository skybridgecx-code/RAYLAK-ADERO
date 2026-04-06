"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { TRPCReactProvider } from "~/lib/trpc/client";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const publishableKey = process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"];

  if (!publishableKey) {
    return <TRPCReactProvider>{children}</TRPCReactProvider>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </ClerkProvider>
  );
}
