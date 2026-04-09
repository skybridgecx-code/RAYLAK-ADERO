export const ADERO_RATING_MIN = 1;
export const ADERO_RATING_MAX = 5;

export const ADERO_RATING_ROLES = ["requester", "operator"] as const;
export type AderoRatingRole = (typeof ADERO_RATING_ROLES)[number];

export const ADERO_RATING_CATEGORIES = [
  "punctuality",
  "professionalism",
  "vehicleCondition",
  "communication",
] as const;
export type AderoRatingCategory = (typeof ADERO_RATING_CATEGORIES)[number];

export const ADERO_RATING_CATEGORY_LABELS: Record<
  AderoRatingCategory,
  string
> = {
  punctuality: "Punctuality",
  professionalism: "Professionalism",
  vehicleCondition: "Vehicle Condition",
  communication: "Communication",
};

export const ADERO_DISPUTE_CATEGORIES = [
  "billing",
  "service_quality",
  "no_show",
  "safety",
  "cancellation",
  "other",
] as const;
export type AderoDisputeCategory = (typeof ADERO_DISPUTE_CATEGORIES)[number];

export const ADERO_DISPUTE_CATEGORY_LABELS: Record<
  AderoDisputeCategory,
  string
> = {
  billing: "Billing",
  service_quality: "Service Quality",
  no_show: "No-Show",
  safety: "Safety",
  cancellation: "Cancellation",
  other: "Other",
};

export const ADERO_DISPUTE_STATUSES = [
  "open",
  "under_review",
  "resolved",
  "escalated",
  "dismissed",
] as const;
export type AderoDisputeStatus = (typeof ADERO_DISPUTE_STATUSES)[number];

export const ADERO_DISPUTE_STATUS_LABELS: Record<
  AderoDisputeStatus,
  string
> = {
  open: "Open",
  under_review: "Under Review",
  resolved: "Resolved",
  escalated: "Escalated",
  dismissed: "Dismissed",
};

export const ADERO_DISPUTE_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type AderoDisputePriority = (typeof ADERO_DISPUTE_PRIORITIES)[number];

export const ADERO_DISPUTE_PRIORITY_LABELS: Record<
  AderoDisputePriority,
  string
> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const ADERO_DISPUTE_STATUS_TRANSITIONS: Record<
  AderoDisputeStatus,
  AderoDisputeStatus[]
> = {
  open: ["under_review", "dismissed"],
  under_review: ["resolved", "escalated", "dismissed"],
  escalated: ["under_review", "resolved", "dismissed"],
  resolved: [],
  dismissed: ["open"],
};

export const ADERO_INCIDENT_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type AderoIncidentSeverity =
  (typeof ADERO_INCIDENT_SEVERITIES)[number];

export const ADERO_INCIDENT_SEVERITY_LABELS: Record<
  AderoIncidentSeverity,
  string
> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const ADERO_INCIDENT_CATEGORIES = [
  "accident",
  "safety_concern",
  "vehicle_issue",
  "passenger_behavior",
  "operator_behavior",
  "route_deviation",
  "other",
] as const;
export type AderoIncidentCategory =
  (typeof ADERO_INCIDENT_CATEGORIES)[number];

export const ADERO_INCIDENT_CATEGORY_LABELS: Record<
  AderoIncidentCategory,
  string
> = {
  accident: "Accident",
  safety_concern: "Safety Concern",
  vehicle_issue: "Vehicle Issue",
  passenger_behavior: "Passenger Behavior",
  operator_behavior: "Operator Behavior",
  route_deviation: "Route Deviation",
  other: "Other",
};

export const ADERO_INCIDENT_STATUSES = [
  "reported",
  "investigating",
  "action_taken",
  "closed",
] as const;
export type AderoIncidentStatus = (typeof ADERO_INCIDENT_STATUSES)[number];

export const ADERO_INCIDENT_STATUS_LABELS: Record<
  AderoIncidentStatus,
  string
> = {
  reported: "Reported",
  investigating: "Investigating",
  action_taken: "Action Taken",
  closed: "Closed",
};

export const ADERO_INCIDENT_STATUS_TRANSITIONS: Record<
  AderoIncidentStatus,
  AderoIncidentStatus[]
> = {
  reported: ["investigating", "closed"],
  investigating: ["action_taken", "closed"],
  action_taken: ["closed"],
  closed: [],
};

export const ADERO_PENALTY_TYPES = [
  "none",
  "fee",
  "warning",
  "suspension",
] as const;
export type AderoPenaltyType = (typeof ADERO_PENALTY_TYPES)[number];

export const ADERO_PENALTY_TYPE_LABELS: Record<AderoPenaltyType, string> = {
  none: "None",
  fee: "Fee",
  warning: "Warning",
  suspension: "Suspension",
};

export const ADERO_CANCEL_FREE_WINDOW_MINUTES = 60;
export const ADERO_CANCEL_FEE_WINDOW_MINUTES = 15;

export const ADERO_CANCEL_FEE_PERCENT_LATE = 0.25;
export const ADERO_CANCEL_FEE_PERCENT_VERY_LATE = 0.5;

export const ADERO_OPERATOR_CANCEL_THRESHOLD = 5;

export const ADERO_TRUST_TIERS = [
  "new",
  "standard",
  "trusted",
  "preferred",
  "suspended",
] as const;
export type AderoTrustTier = (typeof ADERO_TRUST_TIERS)[number];

export const ADERO_TRUST_TIER_LABELS: Record<AderoTrustTier, string> = {
  new: "New",
  standard: "Standard",
  trusted: "Trusted",
  preferred: "Preferred",
  suspended: "Suspended",
};

export const ADERO_TRUST_TIER_THRESHOLDS: Record<
  Exclude<AderoTrustTier, "new" | "suspended">,
  { min: number }
> = {
  standard: { min: 30 },
  trusted: { min: 60 },
  preferred: { min: 80 },
};

export const ADERO_TRUST_MIN_TRIPS_FOR_TIER = 5;

export const ADERO_TRUST_SCORE_WEIGHTS = {
  ratingAverage: 0.35,
  completionRate: 0.25,
  onTimeRate: 0.2,
  cancellationRate: 0.1,
  disputeRate: 0.1,
} as const;

export const ADERO_TRUST_DISPATCH_MINIMUM = 25;
