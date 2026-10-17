"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Eye } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIdToken } from "@/stores/useAuthStore";

import { fetchPatientIntake } from "../../lib/api/patientIntake";

function shortDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Where the patient's health form stands, in one line: sent to their doctor,
 * or seen by them. Patients could not tell whether their intake had been
 * accepted; the wizard simply moved on.
 *
 * Reads the `["booking-intake", bookingId, idToken]` query the booking page and
 * the intake form already hold, so it adds no request. Renders nothing for a
 * draft or while loading.
 */
export function IntakeReceipt({ bookingId, className }: { bookingId: string; className?: string }) {
  const idToken = useIdToken();
  const intakeQuery = useQuery({
    queryKey: ["booking-intake", bookingId, idToken],
    queryFn: () => fetchPatientIntake(idToken ?? "", bookingId),
    enabled: Boolean(idToken),
    staleTime: 30_000,
    retry: false,
    throwOnError: false,
  });
  const form = intakeQuery.data;
  if (!form || (form.status !== "submitted" && form.status !== "acknowledged")) return null;

  const seen = form.status === "acknowledged";
  const when = shortDate(seen ? form.acknowledgedAt : form.submittedAt);
  const Icon = seen ? Eye : CheckCircle2;

  return (
    <p
      data-slot="intake-receipt"
      data-state={seen ? "seen" : "sent"}
      className={cn("flex items-center gap-2 text-[15px] font-medium text-(--teal-800)", className)}
    >
      <Icon aria-hidden className="size-4.5 shrink-0" />
      <span>
        {seen ? "Your doctor has seen your health form" : "Health form sent to your doctor"}
        {when ? <span className="font-normal text-(--text-muted)"> · {when}</span> : null}
      </span>
    </p>
  );
}
