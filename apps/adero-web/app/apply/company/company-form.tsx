"use client";

import { useActionState } from "react";
import { submitCompanyApplication } from "./actions";
import { initialActionState } from "~/lib/validators";
import { Field, TextareaField } from "~/components/form-field";

export function CompanyForm() {
  const [state, formAction, isPending] = useActionState(
    submitCompanyApplication,
    initialActionState,
  );

  const fe = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-8">
      {/* Global error */}
      {state.error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#dc2626" }}
        >
          {state.error}
        </div>
      )}

      {/* Company */}
      <fieldset className="space-y-5">
        <legend
          className="text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#6366f1" }}
        >
          Company
        </legend>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <Field
              label="Company Name"
              name="companyName"
              required
              placeholder="Prestige Limousine DC"
              errors={fe["companyName"]}
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Website"
              name="website"
              type="url"
              placeholder="https://yourcompany.com"
              errors={fe["website"]}
            />
          </div>
        </div>
      </fieldset>

      {/* Primary contact */}
      <fieldset className="space-y-5">
        <legend
          className="text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#6366f1" }}
        >
          Primary Contact
        </legend>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            label="First Name"
            name="contactFirstName"
            required
            placeholder="James"
            errors={fe["contactFirstName"]}
          />
          <Field
            label="Last Name"
            name="contactLastName"
            required
            placeholder="Harrington"
            errors={fe["contactLastName"]}
          />
          <Field
            label="Email Address"
            name="email"
            type="email"
            required
            placeholder="james@yourcompany.com"
            errors={fe["email"]}
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            placeholder="+1 (202) 555-0100"
            errors={fe["phone"]}
          />
        </div>
      </fieldset>

      {/* Operations */}
      <fieldset className="space-y-5">
        <legend
          className="text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#6366f1" }}
        >
          Operations
        </legend>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            label="Fleet Size"
            name="fleetSize"
            type="number"
            placeholder="12"
            hint="Approximate number of active vehicles"
            errors={fe["fleetSize"]}
          />
          <div className="sm:col-span-2">
            <TextareaField
              label="Service Markets"
              name="serviceMarkets"
              required
              rows={2}
              placeholder="Washington DC Metro, Baltimore, Northern Virginia…"
              hint="Which cities or regions does your company primarily serve?"
              errors={fe["serviceMarkets"]}
            />
          </div>
          <div className="sm:col-span-2">
            <TextareaField
              label="Overflow & Capacity Needs"
              name="overflowNeeds"
              rows={3}
              placeholder="We regularly have excess demand on weekends and during peak travel seasons…"
              hint="Describe how you'd use overflow capacity or how you'd contribute to the network."
              errors={fe["overflowNeeds"]}
            />
          </div>
        </div>
      </fieldset>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: "#6366f1" }}
        >
          {isPending ? "Submitting…" : "Submit Application"}
        </button>
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          We review all applications within 5 business days.
        </p>
      </div>
    </form>
  );
}
