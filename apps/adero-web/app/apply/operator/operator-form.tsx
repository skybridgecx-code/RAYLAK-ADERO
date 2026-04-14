"use client";

import { useActionState } from "react";
import { submitOperatorApplication } from "./actions";
import { initialActionState, VEHICLE_TYPES, VEHICLE_TYPE_LABELS } from "~/lib/validators";
import { Field, TextareaField, SelectField } from "~/components/form-field";

const vehicleOptions = VEHICLE_TYPES.map((v) => ({
  value: v,
  label: VEHICLE_TYPE_LABELS[v],
}));

export function OperatorForm() {
  const [state, formAction, isPending] = useActionState(
    submitOperatorApplication,
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

      {/* Personal */}
      <fieldset className="space-y-5">
        <legend
          className="text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#6366f1" }}
        >
          Personal Information
        </legend>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            label="First Name"
            name="firstName"
            required
            placeholder="Marcus"
            errors={fe["firstName"]}
          />
          <Field
            label="Last Name"
            name="lastName"
            required
            placeholder="Williams"
            errors={fe["lastName"]}
          />
          <Field
            label="Email Address"
            name="email"
            type="email"
            required
            placeholder="marcus@example.com"
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

      {/* Location */}
      <fieldset className="space-y-5">
        <legend
          className="text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#6366f1" }}
        >
          Location
        </legend>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            label="City"
            name="city"
            required
            placeholder="Washington"
            errors={fe["city"]}
          />
          <Field
            label="State"
            name="state"
            placeholder="DC"
            errors={fe["state"]}
          />
        </div>
      </fieldset>

      {/* Vehicle */}
      <fieldset className="space-y-5">
        <legend
          className="text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#6366f1" }}
        >
          Vehicle
        </legend>
        <div className="grid sm:grid-cols-2 gap-5">
          <SelectField
            label="Primary Vehicle Type"
            name="vehicleType"
            required
            options={vehicleOptions}
            errors={fe["vehicleType"]}
          />
          <Field
            label="Vehicle Year"
            name="vehicleYear"
            type="number"
            placeholder={String(new Date().getFullYear())}
            errors={fe["vehicleYear"]}
          />
        </div>
      </fieldset>

      {/* Experience */}
      <fieldset className="space-y-5">
        <legend
          className="text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#6366f1" }}
        >
          Experience
        </legend>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            label="Years of Experience"
            name="yearsExperience"
            type="number"
            placeholder="5"
            errors={fe["yearsExperience"]}
          />
          <div className="sm:col-span-2">
            <TextareaField
              label="Current Company Affiliations"
              name="currentAffiliations"
              rows={2}
              placeholder="Currently affiliated with Capitol Limo, occasional work for Embassy Transport…"
              hint="Which transportation companies do you currently work with, if any?"
              errors={fe["currentAffiliations"]}
            />
          </div>
          <div className="sm:col-span-2">
            <TextareaField
              label="About You"
              name="bio"
              rows={3}
              placeholder="I have been operating a black-car service in the DC Metro area for 8 years…"
              hint="Tell us about your experience and why you want to join the Adero network."
              errors={fe["bio"]}
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
