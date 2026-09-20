import { api, ApiError } from "@/lib/api";

/**
 * Admin panel data access (Slice 8, task 14.1, Requirements 13.1, 13.2, 13.3,
 * 13.5, 13.6).
 *
 * These helpers wrap the contract-frozen admin endpoints and are consumed
 * through {@link AsyncView} so each admin page renders the four defined states
 * (loading → data | empty | error) with a 10s timeout. Every helper throws an
 * {@link ApiError} when no auth token is available or the request fails, so the
 * calling `AsyncView` surfaces the defined error state with no partial or
 * previously cached data (Requirement 13.5).
 *
 * No backend route, request field, or envelope is modified (Requirement 15).
 */

const AUTH_REQUIRED = new ApiError(
  "AUTH_REQUIRED",
  "You must be signed in as an admin to view this page.",
  401,
);

/** Default page size requested from the paginated admin list endpoints. */
export const ADMIN_LIST_PAGE_SIZE = 50;

/**
 * A platform user as returned by `GET /v1/admin/users`
 * (backend `lib/admin-users.ts#ApiAdminUser`).
 */
export interface AdminUser {
  userId: string;
  email: string;
  enabled: boolean;
  status: string;
  groups: string[];
  createdAt?: string;
}

/**
 * Platform settings as returned by `GET /v1/admin/settings`
 * (backend `lib/platform-settings.ts#PlatformSettings`).
 */
export interface PlatformSettings {
  maintenanceMode: boolean;
  notificationsEnabled: boolean;
  defaultConsultationAmountCents: number;
  defaultCurrency: string;
  intakeReminderMinutes: number;
  updatedAt: string;
  updatedBy: string;
}

/**
 * A doctor KYC application as returned by `GET /v1/admin/kyc-applications`
 * (backend `lib/doctor-kyc.ts#toApiDoctorProfile`). Kept permissive on
 * `verificationStatus` so an unknown value flows through to a defined fallback.
 */
export interface KycApplication {
  doctorId: string;
  email: string;
  fullName: string;
  licenseNumber: string;
  specialty: string;
  phoneNumber?: string;
  onDemandAvailable?: boolean;
  verificationStatus: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Delivery channel a notification was dispatched through
 * (contract: `NotificationEvent.channel`).
 */
export type NotificationChannel = "email" | "sms";

/**
 * Delivery state of a notification outbox entry
 * (contract: `NotificationEvent.deliveryStatus`). Kept as a union for the known
 * values, but the page treats any unexpected value through a defined fallback.
 */
export type NotificationDeliveryStatus =
  | "outbox"
  | "sent"
  | "skipped"
  | "failed";

/**
 * A single notification outbox entry as returned by
 * `GET /v1/admin/notification-events` (backend `lib/notifications.ts`). The
 * endpoint is admin-scoped to a booking (a notification outbox), not a per-user
 * feed, so every event carries the `bookingId` it was emitted for.
 */
export interface NotificationEvent {
  notificationId: string;
  template: string;
  channel: NotificationChannel;
  bookingId: string;
  recipientUserId?: string;
  recipientRole?: string;
  subject?: string;
  body?: string;
  deliveryStatus: NotificationDeliveryStatus;
  createdAt: string;
}

/**
 * Fetch the notification outbox for a booking from
 * `GET /v1/admin/notification-events?bookingId=...`.
 *
 * `bookingId` is required by the contract (pattern `^bk_[a-z0-9]+$`) and is
 * URL-encoded into the query string. Requires the `admin` role.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @param bookingId - The booking whose notification outbox is being listed.
 * @returns The notification events in the response `data` array (possibly empty).
 * @throws {ApiError} when no token is present or the request fails.
 */
export async function fetchNotificationEvents(
  token: string,
  bookingId: string,
): Promise<NotificationEvent[]> {
  if (!token) throw AUTH_REQUIRED;
  const res = await api.get<NotificationEvent[]>(
    `/v1/admin/notification-events?bookingId=${encodeURIComponent(bookingId)}&limit=${ADMIN_LIST_PAGE_SIZE}`,
    token,
  );
  return res.data ?? [];
}

/**
 * Fetch the platform user list from `GET /v1/admin/users`.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @returns The user records in the response `data` array (possibly empty).
 * @throws {ApiError} when no token is present or the request fails.
 */
export async function fetchAdminUsers(token: string): Promise<AdminUser[]> {
  if (!token) throw AUTH_REQUIRED;
  const res = await api.get<AdminUser[]>(
    `/v1/admin/users?limit=${ADMIN_LIST_PAGE_SIZE}`,
    token,
  );
  return res.data ?? [];
}

/**
 * Fetch platform settings from `GET /v1/admin/settings`.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @returns The platform settings object.
 * @throws {ApiError} when no token is present or the request fails.
 */
export async function fetchPlatformSettings(
  token: string,
): Promise<PlatformSettings> {
  if (!token) throw AUTH_REQUIRED;
  const res = await api.get<PlatformSettings>("/v1/admin/settings", token);
  return res.data;
}

/**
 * Fetch the doctor KYC review queue from `GET /v1/admin/kyc-applications`.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @returns The KYC application records in the response `data` array (possibly empty).
 * @throws {ApiError} when no token is present or the request fails.
 */
export async function fetchKycApplications(
  token: string,
): Promise<KycApplication[]> {
  if (!token) throw AUTH_REQUIRED;
  const res = await api.get<KycApplication[]>(
    `/v1/admin/kyc-applications?limit=${ADMIN_LIST_PAGE_SIZE}`,
    token,
  );
  return res.data ?? [];
}

/**
 * Admin KYC review decision (contract: `KycReviewRequest.decision`). A doctor
 * profile in `pending` can be moved to `approved` or `rejected`.
 */
export type KycDecision = "approved" | "rejected";

/** Maximum length the backend accepts for a rejection reason. */
export const KYC_REJECTION_REASON_MAX = 1000;

/**
 * Review a doctor KYC application via
 * `POST /v1/admin/kyc-applications/{doctorId}/review`.
 *
 * `approved` marks the doctor verified; `rejected` records the optional
 * `rejectionReason`. Requires the `admin` role. The write is idempotent — pass a
 * stable `idempotencyKey` so a retry of the *same* logical review reuses the key
 * (the backend then returns the same outcome rather than re-applying it). The
 * body only carries `rejectionReason` when a non-empty value is supplied.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @param doctorId - The doctor whose application is being reviewed.
 * @param decision - `"approved"` or `"rejected"`.
 * @param rejectionReason - Optional reason (<=1000 chars), only sent when present.
 * @param idempotencyKey - Optional key reused across retries of one review.
 * @returns The updated doctor profile (its `verificationStatus` reflects the decision).
 * @throws {ApiError} when no token is present or the request fails.
 */
export async function reviewKycApplication(
  token: string,
  doctorId: string,
  decision: KycDecision,
  rejectionReason?: string,
  idempotencyKey?: string,
): Promise<KycApplication> {
  if (!token) throw AUTH_REQUIRED;
  const trimmed = rejectionReason?.trim();
  const body: { decision: KycDecision; rejectionReason?: string } = { decision };
  if (trimmed) {
    body.rejectionReason = trimmed.slice(0, KYC_REJECTION_REASON_MAX);
  }
  const res = await api.post<KycApplication>(
    `/v1/admin/kyc-applications/${encodeURIComponent(doctorId)}/review`,
    token,
    body,
    idempotencyKey,
  );
  return res.data;
}

// ── Operational booking queue ────────────────────────────────────────────────

/** Booking lifecycle status (contract: `BookingStatus`). */
export type BookingStatus =
  | "pending_payment"
  | "payment_submitted"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Intake queue state carried on a booking (contract: `IntakeQueueStatus`). */
export type IntakeQueueStatus =
  | "pending"
  | "ready"
  | "in_progress"
  | "need_review";

/**
 * A booking as returned by the admin queue endpoints (contract: `Booking`).
 *
 * Only the fields the admin surfaces actually read are declared. Optional
 * members are optional in the contract too — notably `doctorId`, whose absence
 * is what identifies an unassigned booking on the triage panel.
 */
export interface AdminBooking {
  bookingId: string;
  patientId: string;
  doctorId?: string;
  consultationId?: string;
  bookingMode?: "scheduled" | "on_demand";
  intakeQueueStatus?: IntakeQueueStatus;
  status: BookingStatus;
  serviceType: "general" | "specialist" | "follow_up" | "emergency";
  scheduledAt: string;
  channel: "video" | "audio" | "chat";
  notes?: string;
  amountCents?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
  declinedBy?: string;
  declinedAt?: string;
  declineReason?: string;
}

/**
 * Fetch one page of the admin booking queue from
 * `GET /v1/admin/bookings?status=...`.
 *
 * `status` is required by the contract — the endpoint is a per-status queue, not
 * a general booking search — so callers wanting several statuses issue one
 * request per status. Requires the `admin` role.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @param status - The lifecycle status to list.
 * @returns Up to {@link ADMIN_LIST_PAGE_SIZE} bookings in that status.
 * @throws {ApiError} when no token is present or the request fails.
 */
export async function fetchAdminBookingsByStatus(
  token: string,
  status: BookingStatus,
): Promise<AdminBooking[]> {
  if (!token) throw AUTH_REQUIRED;
  const res = await api.get<AdminBooking[]>(
    `/v1/admin/bookings?status=${encodeURIComponent(status)}&limit=${ADMIN_LIST_PAGE_SIZE}`,
    token,
  );
  return res.data ?? [];
}

/**
 * Fetch a single booking's admin detail from
 * `GET /v1/admin/bookings/{bookingId}`.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @param bookingId - The booking to load.
 * @returns The booking record.
 * @throws {ApiError} when no token is present, the booking is unknown (404), or
 *   the request fails.
 */
export async function fetchAdminBooking(
  token: string,
  bookingId: string,
): Promise<AdminBooking> {
  if (!token) throw AUTH_REQUIRED;
  const res = await api.get<AdminBooking>(
    `/v1/admin/bookings/${encodeURIComponent(bookingId)}`,
    token,
  );
  return res.data;
}

// ── Administrative writes ────────────────────────────────────────────────────

/** An RBAC group a platform account can belong to (contract: `CognitoRbacGroup`). */
export type CognitoRbacGroup = "patient" | "doctor" | "admin";

/** The RBAC groups assignable from the admin UI, in display order. */
export const ASSIGNABLE_GROUPS: readonly CognitoRbacGroup[] = [
  "patient",
  "doctor",
  "admin",
];

/**
 * Replace a user's RBAC group membership via
 * `PUT /v1/admin/users/{userId}/groups`.
 *
 * The contract *replaces* the set rather than adding to it, so `groups` must be
 * the complete intended membership. The backend enforces admin continuity — the
 * last remaining admin cannot demote themselves — and answers `409` when a write
 * would break it, which the caller surfaces rather than swallowing.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @param userId - The account whose groups are being replaced.
 * @param groups - The complete new group membership.
 * @param idempotencyKey - Optional key reused across retries of one change.
 * @returns The updated user record.
 * @throws {ApiError} when no token is present or the request fails.
 */
export async function updateAdminUserGroups(
  token: string,
  userId: string,
  groups: CognitoRbacGroup[],
  idempotencyKey?: string,
): Promise<AdminUser> {
  if (!token) throw AUTH_REQUIRED;
  const res = await api.put<AdminUser>(
    `/v1/admin/users/${encodeURIComponent(userId)}/groups`,
    token,
    { groups },
    idempotencyKey,
  );
  return res.data;
}

/**
 * Enable or disable a platform account via
 * `PUT /v1/admin/users/{userId}/status`.
 *
 * Disabling revokes the account's ability to sign in; it does not delete it.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @param userId - The account being enabled or disabled.
 * @param enabled - `true` to enable, `false` to disable.
 * @param idempotencyKey - Optional key reused across retries of one change.
 * @returns The updated user record.
 * @throws {ApiError} when no token is present or the request fails.
 */
export async function updateAdminUserStatus(
  token: string,
  userId: string,
  enabled: boolean,
  idempotencyKey?: string,
): Promise<AdminUser> {
  if (!token) throw AUTH_REQUIRED;
  const res = await api.put<AdminUser>(
    `/v1/admin/users/${encodeURIComponent(userId)}/status`,
    token,
    { enabled },
    idempotencyKey,
  );
  return res.data;
}

/**
 * A partial platform-settings update (contract:
 * `PlatformSettingsUpdateRequest`). Every member is optional; only the supplied
 * keys are changed. `updatedAt` / `updatedBy` are server-owned and never sent.
 */
export type PlatformSettingsUpdate = Partial<
  Pick<
    PlatformSettings,
    | "maintenanceMode"
    | "notificationsEnabled"
    | "defaultConsultationAmountCents"
    | "defaultCurrency"
    | "intakeReminderMinutes"
  >
>;

/**
 * Apply a partial platform-settings update via `PUT /v1/admin/settings`.
 *
 * Settings are a singleton, so two admins editing concurrently is a real
 * possibility; the backend answers `409` on a conflicting write and the caller
 * surfaces that rather than silently retrying over the other admin's change.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @param patch - The subset of settings to change.
 * @param idempotencyKey - Optional key reused across retries of one save.
 * @returns The full settings object as it stands after the write.
 * @throws {ApiError} when no token is present or the request fails.
 */
export async function updatePlatformSettings(
  token: string,
  patch: PlatformSettingsUpdate,
  idempotencyKey?: string,
): Promise<PlatformSettings> {
  if (!token) throw AUTH_REQUIRED;
  const res = await api.put<PlatformSettings>(
    "/v1/admin/settings",
    token,
    patch,
    idempotencyKey,
  );
  return res.data;
}
