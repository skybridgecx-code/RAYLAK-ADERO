import { z } from "zod";

// ─── Company application ──────────────────────────────────────────────────────

export const CompanyApplicationSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  website: z.string().url("Must be a valid URL (include https://)").optional().or(z.literal("")),
  contactFirstName: z.string().min(1, "First name is required"),
  contactLastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email address required"),
  phone: z.string().optional(),
  fleetSize: z.coerce.number().int().min(1).optional().or(z.literal("")),
  serviceMarkets: z.string().min(3, "Please describe the markets you serve"),
  overflowNeeds: z.string().optional(),
});

export type CompanyApplicationInput = z.infer<typeof CompanyApplicationSchema>;

// ─── Operator application ─────────────────────────────────────────────────────

export const VEHICLE_TYPES = [
  "sedan",
  "suv",
  "sprinter_van",
  "passenger_van",
  "limousine",
  "coach_bus",
  "other",
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  sedan: "Sedan",
  suv: "SUV / Crossover",
  sprinter_van: "Sprinter Van",
  passenger_van: "Passenger Van",
  limousine: "Limousine / Stretch",
  coach_bus: "Coach Bus / Mini-Bus",
  other: "Other",
};

export const OperatorApplicationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email address required"),
  phone: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().optional(),
  vehicleType: z.enum(VEHICLE_TYPES, { message: "Please select a vehicle type" }),
  vehicleYear: z.coerce
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 1)
    .optional()
    .or(z.literal("")),
  yearsExperience: z.coerce.number().int().min(0).max(50).optional().or(z.literal("")),
  currentAffiliations: z.string().optional(),
  bio: z.string().optional(),
});

export type OperatorApplicationInput = z.infer<typeof OperatorApplicationSchema>;

// ─── Application status workflow ─────────────────────────────────────────────

export const APPLICATION_STATUSES = [
  "pending",
  "reviewing",
  "approved",
  "activated",
  "rejected",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "New",
  reviewing: "Reviewing",
  approved: "Approved",
  activated: "Activated",
  rejected: "Rejected",
};

// ─── Activated profile lifecycle ─────────────────────────────────────────────

export const PROFILE_STATUSES = ["active", "paused", "inactive"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  active: "Active",
  paused: "Paused",
  inactive: "Inactive",
};

// ─── Internal member document tracking ───────────────────────────────────────

export const MEMBER_DOCUMENT_TYPES = [
  "insurance",
  "license",
  "permit",
  "registration",
  "contract",
  "other",
] as const;
export type MemberDocumentType = (typeof MEMBER_DOCUMENT_TYPES)[number];

export const MEMBER_DOCUMENT_TYPE_LABELS: Record<MemberDocumentType, string> = {
  insurance: "Insurance",
  license: "License",
  permit: "Permit",
  registration: "Registration",
  contract: "Contract",
  other: "Other",
};

export const MEMBER_DOCUMENT_STATUSES = [
  "pending_review",
  "approved",
  "expired",
  "rejected",
] as const;
export type MemberDocumentStatus = (typeof MEMBER_DOCUMENT_STATUSES)[number];

export type MemberDocumentDisplayStatus = MemberDocumentStatus | "missing" | "expiring_soon";

export const MEMBER_DOCUMENT_STATUS_LABELS: Record<MemberDocumentDisplayStatus, string> = {
  missing: "Missing",
  expiring_soon: "Expiring Soon",
  pending_review: "Pending Review",
  approved: "Approved",
  expired: "Expired",
  rejected: "Rejected",
};

export const MEMBER_DOCUMENT_COMPLIANCE_ACTIONS = [
  "follow_up_needed",
  "reminder_sent",
  "exception_noted",
  "resolved",
] as const;
export type MemberDocumentComplianceAction = (typeof MEMBER_DOCUMENT_COMPLIANCE_ACTIONS)[number];

export const MEMBER_DOCUMENT_COMPLIANCE_ACTION_LABELS: Record<
  MemberDocumentComplianceAction,
  string
> = {
  follow_up_needed: "Follow-Up Needed",
  reminder_sent: "Reminder Sent",
  exception_noted: "Exception Noted",
  resolved: "Resolved",
};

// ─── Compliance escalation ───────────────────────────────────────────────────

export const COMPLIANCE_ESCALATION_STATUSES = [
  "normal",
  "escalated",
  "resolved_after_escalation",
] as const;
export type ComplianceEscalationStatus = (typeof COMPLIANCE_ESCALATION_STATUSES)[number];

export const COMPLIANCE_ESCALATION_STATUS_LABELS: Record<ComplianceEscalationStatus, string> = {
  normal: "Normal",
  escalated: "Escalated",
  resolved_after_escalation: "Resolved (Escalation)",
};

// ─── Shared action state ──────────────────────────────────────────────────────

export interface ApplicationActionState {
  error: string | null;
  fieldErrors: Record<string, string[]>;
}

export const initialActionState: ApplicationActionState = {
  error: null,
  fieldErrors: {},
};

// ─── Request creation ─────────────────────────────────────────────────────────

export const RequestCreationSchema = z.object({
  serviceType: z.string().min(1, "Service type is required"),
  pickupAddress: z.string().trim().min(5, "Pickup address is required"),
  dropoffAddress: z.string().trim().min(5, "Drop-off address is required"),
  pickupAt: z.string().min(1, "Pickup date and time is required").refine(
    (v) => !isNaN(Date.parse(v)),
    "Must be a valid date and time",
  ),
  passengerCount: z.coerce
    .number()
    .int()
    .min(1, "At least 1 passenger required")
    .max(100, "Passenger count too high"),
  vehiclePreference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type RequestCreationInput = z.infer<typeof RequestCreationSchema>;

// ─── Quote calculation and pricing ───────────────────────────────────────────

export const quoteCalculationSchema = z.object({
  serviceType: z.string().min(1),
  estimatedDistanceMiles: z.number().positive().nullable(),
  estimatedDurationMinutes: z.number().int().positive().nullable(),
  pricingTier: z.enum(["standard", "premium", "surge", "custom"]).optional(),
  tolls: z.number().min(0).optional(),
  gratuity: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export const createQuoteSchema = quoteCalculationSchema.extend({
  requestId: z.string().uuid(),
  sendImmediately: z.boolean().optional(),
});

export const manualQuoteSchema = z.object({
  requestId: z.string().uuid(),
  baseFare: z.number().min(0),
  distanceCharge: z.number().min(0).optional(),
  timeCharge: z.number().min(0).optional(),
  surgeCharge: z.number().min(0).optional(),
  tolls: z.number().min(0).optional(),
  gratuity: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  totalAmount: z.number().min(0),
  notes: z.string().optional(),
  sendImmediately: z.boolean().optional(),
});

export const manualInvoiceSchema = z.object({
  tripId: z.string().uuid(),
  subtotal: z.number().min(0),
  taxRate: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).nullable().optional(),
  accuracy: z.number().min(0).nullable().optional(),
  source: z.enum(["gps", "manual", "network", "fused"]).optional(),
  recordedAt: z.string().datetime(),
});

export const startTrackingSchema = z.object({
  tripId: z.string().uuid(),
});

export const recordLocationSchema = z.object({
  sessionId: z.string().uuid(),
  location: locationUpdateSchema,
});
