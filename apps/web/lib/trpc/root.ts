import { createTRPCRouter } from "./trpc";
import { bookingRouter } from "./routers/booking";
import { userRouter } from "./routers/user";
import { dashboardRouter } from "./routers/dashboard";
import { vehicleRouter } from "./routers/vehicle";
import { driverRouter } from "./routers/driver";
import { customerRouter } from "./routers/customer";

export const appRouter = createTRPCRouter({
  booking: bookingRouter,
  user: userRouter,
  dashboard: dashboardRouter,
  vehicle: vehicleRouter,
  driver: driverRouter,
  customer: customerRouter,
});

export type AppRouter = typeof appRouter;
