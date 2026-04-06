import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/lib/trpc/root";
import { createTRPCContext } from "~/lib/trpc/trpc";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ path, error }) {
      if (process.env["NODE_ENV"] === "development") {
        console.error(`[tRPC] ${path ?? "<no-path>"}:`, error);
      }
    },
  });

export { handler as GET, handler as POST };
