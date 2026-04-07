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

export const REQUIRED_MEMBER_DOCUMENT_TYPES = [
  "insurance",
  "license",
  "permit",
  "registration",
  "contract",
] as const;

export const MEMBER_DOCUMENT_STATUSES = [
  "pending_review",
  "approved",
  "expired",
  "rejected",
] as const;
export type MemberDocumentStatus = (typeof MEMBER_DOCUMENT_STATUSES)[number];

export type MemberDocumentDisplayStatus = MemberDocumentStatus | "missing";

export const MEMBER_DOCUMENT_STATUS_LABELS: Record<MemberDocumentDisplayStatus, string> = {
  missing: "Missing",
  pending_review: "Pending Review",
  approved: "Approved",
  expired: "Expired",
  rejected: "Rejected",
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
