import { createTRPCRouter } from "./trpc";
import { bookingRouter } from "./routers/booking";
import { userRouter } from "./routers/user";

export const appRouter = createTRPCRouter({
  booking: bookingRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
