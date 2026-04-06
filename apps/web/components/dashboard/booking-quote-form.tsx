"use client";

import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { trpc } from "~/lib/trpc/client";
import { QuoteBookingSchema, type QuoteBookingInput } from "@raylak/shared/validators";

interface Props {
  bookingId: string;
}

const inputClass =
  "w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-[#c9a96e] focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/20 transition-colors";

export function BookingQuoteForm({ bookingId }: Props) {
  const router = useRouter();

  const { register, handleSubmit, formState } = useForm<QuoteBookingInput>({
    resolver: zodResolver(QuoteBookingSchema) as Resolver<QuoteBookingInput>,
    defaultValues: { bookingId },
  });

  const mutation = trpc.booking.addQuote.useMutation({
    onSuccess: () => router.refresh(),
  });

  const onSubmit: SubmitHandler<QuoteBookingInput> = async (data) => {
    await mutation.mutateAsync(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("bookingId")} />

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[#0c1830] mb-1.5">
          Quoted Amount (USD) <span className="text-[#c9a96e]">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            {...register("quotedAmount")}
            type="number"
            step="0.01"
            min="1"
            placeholder="0.00"
            className={`${inputClass} pl-7`}
          />
        </div>
        {formState.errors.quotedAmount && (
          <p className="text-xs text-red-500 mt-1">{formState.errors.quotedAmount.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[#0c1830] mb-1.5">
          Internal Note
        </label>
        <textarea
          {...register("note")}
          rows={3}
          placeholder="Optional note for this quote (not sent to customer)…"
          className={`${inputClass} resize-none`}
        />
        {formState.errors.note && (
          <p className="text-xs text-red-500 mt-1">{formState.errors.note.message}</p>
        )}
      </div>

      {mutation.error && (
        <p className="text-sm text-red-600">{mutation.error.message}</p>
      )}
      {mutation.isSuccess && (
        <p className="text-sm text-green-600 font-medium">Quote saved. Booking moved to Quoted.</p>
      )}

      <button
        type="submit"
        disabled={formState.isSubmitting || mutation.isPending}
        className="rounded bg-[#0c1830] px-6 py-2.5 text-sm text-white font-semibold hover:bg-[#0e2040] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? "Saving…" : "Save Quote & Move to Quoted"}
      </button>
    </form>
  );
}
