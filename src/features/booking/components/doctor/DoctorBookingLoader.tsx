"use client";

import { useCallback } from "react";

import { AsyncView } from "@/components/async-view";
import { useAuthStore } from "@/stores/useAuthStore";

import {
  fetchDoctorDetail,
  type BackendSlot,
  type DoctorDetailData,
} from "../../lib/api/doctors";
import { selectableSlots } from "../../lib/slotTime";
import { DoctorBookingPage } from "./DoctorBooking";

/**
 * Resolve the real doctor and their real availability before rendering the form.
 *
 * Replaces the page-level literal `{ name: "Dr. Juan", status: "available" }`.
 * Both values are backed: `fullName` comes from `GET /v1/doctors/{doctorId}` and
 * the slots from `GET /v1/doctors/{doctorId}/schedules` — the same reads the
 * doctor detail page already performs.
 *
 * Availability is derived from whether the doctor actually has open slots rather
 * than asserted. A doctor with no published availability shows as `unavailable`,
 * which is what the platform knows, instead of `available`, which it did not.
 *
 * `slotId` carries the slot the patient already picked on the doctor detail
 * page. It is resolved against the slots this component just fetched — see
 * {@link resolveSlotStart} — so a preselected time is always a time the doctor
 * really has open. An absent, unknown, or no-longer-available slot id
 * preselects nothing and leaves the form in its normal unselected state.
 */
export function DoctorBookingLoader({
  doctorId,
  slotId,
  defaultServiceType,
}: {
  doctorId: string;
  slotId?: string | null;
  defaultServiceType?: string | null;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const fetcher = useCallback(
    () => fetchDoctorDetail(doctorId, idToken ?? ""),
    [doctorId, idToken],
  );

  return (
    <AsyncView<DoctorDetailData> fetcher={fetcher} deps={[doctorId, idToken]}>
      {(data) => {
        const resolvedStart = resolveSlotStart(data.slots, slotId);
        return (
          <DoctorBookingPage
            doctorId={doctorId}
            doctorName={data.profile.fullName}
            initialDoctorStatus={
              availableSlots(data.slots).length > 0 ? "available" : "unavailable"
            }
            availableTimes={toTimeOptions(data.slots)}
            defaultServiceType={defaultServiceType}
            initialScheduledAt={resolvedStart}
            // Only forward a slot id that actually resolved to one of this
            // doctor's available slots. Passing through an unknown or stale id
            // would make the backend reject the whole booking with a 404 for a
            // slot the patient never knowingly chose.
            slotId={resolvedStart ? (slotId ?? undefined) : undefined}
          />
        );
      }}
    </AsyncView>
  );
}

/**
 * Resolve a slot id from the URL to the start time of a slot the doctor has.
 *
 * The patient picks a time on `/patient/booking/doctor/{doctorId}`, which navigates here
 * with `?slotId=...`. Nothing read that parameter, so the choice was discarded
 * and the form opened unselected.
 *
 * Trust is one-directional: the id from the URL only selects among the slots
 * this component fetched. A link can be stale — bookmarked, shared, or opened
 * after someone else took the slot — so an id that matches no `available` slot
 * resolves to `undefined` and the form stays unselected. Guessing a time from an
 * id that no longer exists would put the patient in front of a confirmation
 * screen for an appointment nobody holds.
 *
 * Exported for test: the absent / unknown / booked / malformed cases are the
 * behaviour worth pinning and need no rendered tree.
 *
 * @param slots  - The doctor's slots as fetched from
 *   `GET /v1/doctors/{doctorId}/schedules`.
 * @param slotId - Candidate slot id from the query string, if any.
 * @returns The slot's local start `Date`, or `undefined` when nothing matches.
 */
export function resolveSlotStart(
  slots: BackendSlot[],
  slotId?: string | null,
): Date | undefined {
  if (!slotId) return undefined;
  const match = availableSlots(slots).find((slot) => slot.slotId === slotId);
  if (!match) return undefined;
  return toSlotDate(match.date, match.startTime);
}

/**
 * Combine a slot's `YYYY-MM-DD` date and `HH:MM` start into a local `Date`.
 *
 * Built field by field in local time rather than parsed from a concatenated
 * string: the picker and the schedule list both present slot times as the
 * viewer's wall-clock time, so the preselected value has to mean the same clock
 * time the patient clicked. `POST /v1/bookings` takes `scheduledAt` as an
 * ISO-8601 instant, and `DoctorBooking` serialises this Date with
 * `toISOString()`, which applies the offset.
 *
 * Returns `undefined` for anything malformed or out of range, including the
 * calendar-invalid dates `Date` would otherwise roll over (e.g. Feb 30).
 */
function toSlotDate(date: string, startTime: string): Date | undefined {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(startTime.trim());
  if (!dateMatch || !timeMatch) return undefined;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  if (hours > 23 || minutes > 59) return undefined;

  const resolved = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(resolved.getTime())) return undefined;
  // Reject a rolled-over date (Feb 30 -> Mar 2) rather than booking a day the
  // slot was never published for.
  if (
    resolved.getFullYear() !== year ||
    resolved.getMonth() !== month - 1 ||
    resolved.getDate() !== day
  ) {
    return undefined;
  }
  return resolved;
}

/**
 * Slots the patient may still pick: published, unclaimed, and not yet started.
 *
 * The past-start condition matters as much as the status one. A 09:00 slot is
 * still `available` at 15:00 the same day, and `POST /v1/bookings` refuses a slot
 * that has already begun — so preselecting or offering one produces a failure at
 * the final step rather than at the point of choosing.
 */
function availableSlots(slots: BackendSlot[]): BackendSlot[] {
  return selectableSlots(slots);
}

/**
 * Project the doctor's open slots into the picker's `hh:mm AM/PM` option list.
 *
 * The picker previously fell back to a hardcoded six-slot window
 * (`"09:00 AM"`…`"11:30 AM"`) for every doctor, so the patient chose a time from
 * an invented schedule. De-duplicated and sorted because two dates can publish
 * the same clock time.
 */
export function toTimeOptions(slots: BackendSlot[]): string[] {
  const times = new Set<string>();
  for (const slot of availableSlots(slots)) {
    const formatted = formatSlotTime(slot.startTime);
    if (formatted) times.add(formatted);
  }
  return [...times].sort((a, b) => toMinutes(a) - toMinutes(b));
}

/** `"14:30"` -> `"02:30 PM"`. Returns null for a malformed value. */
function formatSlotTime(startTime: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(startTime.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const period = hours < 12 ? "AM" : "PM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(displayHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function toMinutes(display: string): number {
  const match = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(display);
  if (!match) return 0;
  let hours = Number(match[1]) % 12;
  if (match[3] === "PM") hours += 12;
  return hours * 60 + Number(match[2]);
}
