/**
 * Build an iCalendar invite for an upcoming consultation.
 *
 * Client-side and dependency-free: the platform has no calendar integration and
 * needs none for this. An `.ics` file is the interoperable answer — Google
 * Calendar, Outlook, and iOS all import it — and it keeps the appointment time
 * out of a third party's hands, which matters more here than convenience.
 *
 * No clinical detail goes in the invite. A calendar entry syncs to devices,
 * assistants, and shared work calendars the patient does not control, so the
 * summary names the platform and nothing about why they are consulting. The
 * doctor's name is included only when the caller has it, because a patient
 * seeing "Consultation with Dr. Santos" in their own calendar is useful and
 * discloses no condition.
 */

export interface CalendarInvite {
  /** Appointment start. */
  start: Date;
  /** Minutes the entry should span. */
  durationMinutes?: number;
  /** Assigned doctor's name, when disclosed. */
  doctorName?: string;
  /** Absolute URL the patient joins from. */
  url?: string;
  /** Stable id so a re-import updates rather than duplicates. */
  bookingId: string;
}

/** `2026-09-09T15:30:00Z` -> `20260909T153000Z`. */
function toIcsUtc(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/**
 * Escape a text value per RFC 5545: backslash, semicolon, comma and newline
 * are all structural in an ICS property value.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold a content line at 75 octets per RFC 5545, continuing with a single
 * leading space. Long join URLs exceed the limit on their own.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length > 0) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

/** The `.ics` document for one consultation. CRLF line endings, as required. */
export function buildConsultationIcs(invite: CalendarInvite): string {
  const { start, durationMinutes = 30, doctorName, url, bookingId } = invite;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const summary = doctorName
    ? `BayanHealth consultation with ${doctorName}`
    : "BayanHealth consultation";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BayanHealth//Patient Consultation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Stable across exports of the same booking, so re-importing updates the
    // existing entry instead of adding a second one.
    `UID:${bookingId}@bayanhealth.co`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(
      "Your teleconsultation. Open BayanHealth a few minutes early to check your camera and microphone.",
    )}`,
    ...(url ? [`URL:${escapeText(url)}`] : []),
    // A reminder 15 minutes out — the appointment is only useful if attended.
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Your BayanHealth consultation starts in 15 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** Filename for the downloaded invite. */
export function icsFilename(bookingId: string): string {
  return `bayanhealth-${bookingId}.ics`;
}
