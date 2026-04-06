import type { UserRole, BookingStatus, VehicleType, ServiceType } from "./enums";

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── API Response Shape ───────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserPublic {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  createdAt: Date;
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export interface BookingStop {
  id: string;
  bookingId: string;
  sequence: number;
  address: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
}

export interface BookingSummary {
  id: string;
  referenceCode: string;
  status: BookingStatus;
  serviceType: ServiceType;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: Date;
  totalAmount: number | null;
  customerName: string;
  driverName: string | null;
  vehicleLabel: string | null;
}

// ─── Vehicle ──────────────────────────────────────────────────────────────────

export interface VehicleSummary {
  id: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  licensePlate: string;
  color: string | null;
  capacity: number;
  isActive: boolean;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorRole: UserRole | null;
  before: unknown;
  after: unknown;
  createdAt: Date;
}
