import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Book a Ride",
  description:
    "Request executive ground transportation from RAYLAK. Airport transfers, corporate travel, and luxury charter in the DC Metro area.",
};

export default function BookPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="py-20 px-4 text-center"
        style={{ background: "linear-gradient(165deg, #0c1830, #0e2040)" }}
      >
        <div className="mx-auto max-w-2xl">
          <p className="text-[#c9a96e] text-xs tracking-[5px] uppercase font-semibold mb-4">
            Reservations
          </p>
          <h1 className="text-white text-4xl sm:text-5xl font-light tracking-tight">
            Request Your Ride
          </h1>
          <p className="mt-4 text-white/60 text-base leading-relaxed">
            Submit your details below. We&apos;ll confirm your booking and quote within the hour.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-white py-16 px-4">
        <div className="mx-auto max-w-2xl">
          <Suspense fallback={<div className="py-20 text-center text-gray-400 text-sm">Loading form…</div>}>
            <BookingForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}
