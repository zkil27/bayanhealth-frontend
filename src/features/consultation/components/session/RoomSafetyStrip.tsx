"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIdToken } from "@/stores/useAuthStore";
import {
  fetchBookingIntake,
  isNegativeAllergy,
  usableAllergyLabel,
} from "@/features/doctor/lib/api/bookingIntake";

/**
 * The two facts a doctor must never lose sight of mid-consult — drug
 * allergies and red-flag answers — as one line pinned above the companion
 * suite's tabs, so they stay visible while the doctor is on the Conversation
 * tab too (on a phone, that tab hides the whole intake).
 *
 * Reads the same `["booking-intake", bookingId, idToken]` query the room
 * header already reads for the patient's name, so it adds no request. Every
 * value is the patient's own submission: an allergy field that is blank stays
 * "not recorded" (never "none"), a negative statement ("NKDA") reads as no
 * known allergies, and an unanswered red-flag question is never drawn as a
 * negative answer — same rules as `PatientIntakeReferenceTab`.
 *
 * Renders nothing until the intake loads, or when there is no intake at all
 * (the Intake tab already explains that state in full).
 */
export function RoomSafetyStrip({ bookingId }: { bookingId: string }) {
  const idToken = useIdToken();
  const isDemo = bookingId === "demo" || bookingId.startsWith("demo");

  const intakeQuery = useQuery({
    queryKey: ["booking-intake", bookingId, idToken],
    queryFn: () => fetchBookingIntake(idToken ?? "", bookingId),
    enabled: !!idToken || isDemo,
    staleTime: 1000 * 30,
    retry: false,
    throwOnError: false,
  });

  const details = intakeQuery.data?.sections?.details;
  if (!details) return null;

  const rawAllergies = details.allergies;
  const allergyLabel = usableAllergyLabel(rawAllergies);
  const allergyText = allergyLabel
    ? allergyLabel
    : rawAllergies?.trim() && isNegativeAllergy(rawAllergies)
      ? "No known allergies"
      : "Not recorded";

  const screen = details.safetyScreen;
  const positives = [
    screen?.chestPain === true ? "chest pain" : null,
    screen?.dyspnea === true ? "shortness of breath" : null,
    typeof screen?.feverDays === "number" && screen.feverDays > 0
      ? `fever ${screen.feverDays}d`
      : null,
  ].filter(Boolean);
  const anyUnanswered =
    typeof screen?.chestPain !== "boolean" ||
    typeof screen?.dyspnea !== "boolean" ||
    typeof screen?.feverDays !== "number";

  const redFlag =
    positives.length > 0
      ? { tone: "danger" as const, text: `Red flag: ${positives.join(", ")}`, Icon: ShieldAlert }
      : anyUnanswered
        ? { tone: "caution" as const, text: "Red flags: screening incomplete", Icon: TriangleAlert }
        : { tone: "ok" as const, text: "No red flags reported", Icon: ShieldCheck };

  return (
    <div
      data-slot="room-safety-strip"
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-(--border-subtle) bg-(--surface-warm) px-3 py-2 text-xs"
    >
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-1.5 font-semibold",
          allergyLabel ? "text-(--danger-fg)" : "text-(--text-body)",
        )}
      >
        {allergyLabel ? <ShieldAlert className="size-3.5 shrink-0" aria-hidden /> : null}
        <span className="text-(--text-muted) font-medium">Allergies:</span>
        <span className="truncate">{allergyText}</span>
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-semibold",
          redFlag.tone === "danger" && "text-(--danger-fg)",
          redFlag.tone === "caution" && "text-(--status-soon-fg)",
          redFlag.tone === "ok" && "text-(--status-available-fg)",
        )}
      >
        <redFlag.Icon className="size-3.5 shrink-0" aria-hidden />
        {redFlag.text}
      </span>
    </div>
  );
}
