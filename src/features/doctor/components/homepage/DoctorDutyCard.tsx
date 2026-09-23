"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useIdToken } from "@/stores/useAuthStore";
import { useMyDoctorProfile } from "@/features/doctor/hooks/useMyDoctorProfile";
import { updateDoctorProfile } from "@/features/doctor/lib/api/kyc";

export const DOCTOR_ME_PROFILE_QUERY_KEY = "doctor-me-profile";

/**
 * The Clinical Duty Command Card — a single unmistakable on/off switch for
 * on-demand availability, given its own card in the rail rather than a small
 * pill buried in the identity header.
 *
 * Writes through the same real field `DoctorProfileView`'s own availability
 * switch does — `PUT /v1/doctors/me/profile` with `onDemandAvailable`
 * (`useMyDoctorProfile`'s doc explains why this field, not a client
 * assumption, is the source of truth). The upsert is a full replace, not a
 * patch, so this reuses `profile`'s own `fullName`/`licenseNumber` verbatim
 * rather than risk detaching them.
 *
 * Scheduled appointments are unaffected either way — going off-duty pauses
 * new on-demand routing only, which is what the copy states rather than
 * implies.
 */
export function DoctorDutyCard() {
  const idToken = useIdToken();
  const queryClient = useQueryClient();
  const { profile, isLoading } = useMyDoctorProfile();
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(createIdempotencyKeyManager());

  const isOnDuty = profile?.onDemandAvailable ?? false;

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      if (!idToken || !profile) throw new Error("Your profile hasn't loaded yet.");
      await updateDoctorProfile(
        idToken,
        {
          fullName: profile.fullName,
          licenseNumber: profile.licenseNumber,
          ...(profile.specialty ? { specialty: profile.specialty } : {}),
          ...(profile.phoneNumber ? { phoneNumber: profile.phoneNumber } : {}),
          ...(profile.bio ? { bio: profile.bio } : {}),
          onDemandAvailable: next,
        },
        keyRef.current.current(),
      );
      keyRef.current.reset();
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: [DOCTOR_ME_PROFILE_QUERY_KEY] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Couldn't update your duty status.");
    },
  });

  if (isLoading) {
    return (
      <div
        data-slot="doctor-duty-card"
        aria-hidden
        className="h-[86px] animate-pulse rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-warm)"
      />
    );
  }

  return (
    <div
      data-slot="doctor-duty-card"
      className={cn(
        // `--radius-canvas` (28px), matching `DoctorIdentityCard` and
        // `UpcomingTodayCard` above and below it in the rail — one card
        // shape for the whole column, not three different curvatures.
        "flex flex-col gap-2 rounded-(--radius-canvas) border p-4 transition-colors",
        isOnDuty
          ? "border-(--status-available-fg)/25 bg-(--status-available-bg)"
          : "border-(--border-subtle) bg-(--surface-warm)",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase",
            isOnDuty ? "text-(--status-available-fg)" : "text-(--text-subtle)",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              isOnDuty ? "bg-(--status-available-fg)" : "bg-(--gray-fg)",
            )}
          />
          {isOnDuty ? "On-duty · accepting walk-ins" : "Offline · walk-ins paused"}
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={isOnDuty}
          aria-label={isOnDuty ? "Go offline" : "Go on-duty"}
          disabled={toggle.isPending || !profile}
          onClick={() => toggle.mutate(!isOnDuty)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:cursor-not-allowed disabled:opacity-60",
            isOnDuty ? "bg-(--status-available-fg)" : "bg-(--gray-fg)",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-(--surface-raised) shadow-sm transition-transform",
              isOnDuty && "translate-x-5",
            )}
          />
        </button>
      </div>

      <p className="text-[11.5px] leading-tight text-(--text-muted)">
        {isOnDuty
          ? "New on-demand requests will be routed to you. Your scheduled appointments are unaffected."
          : "You will not receive new on-demand requests. Scheduled appointments still go ahead."}
      </p>

      {error ? (
        <p role="alert" className="text-[11.5px] font-semibold text-(--danger-fg)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
