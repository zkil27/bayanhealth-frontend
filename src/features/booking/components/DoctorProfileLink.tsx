import Link from "next/link";
import { UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "View doctor profile" link to the patient-facing doctor page.
 *
 * The profile was reachable only from the Finding and Confirmation steps, so a
 * patient in the chat, on Home, or after the consultation had no way to see who
 * their doctor was (10-02 demo). Renders nothing without an assigned doctor:
 * there is no profile to link to, and an "undisclosed" doctor stays undisclosed.
 */
export function DoctorProfileLink({
  doctorId,
  className,
}: {
  doctorId: string | null | undefined;
  className?: string;
}) {
  if (!doctorId) return null;
  return (
    <Link
      href={`/patient/booking/doctor/${encodeURIComponent(doctorId)}`}
      data-slot="doctor-profile-link"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-(--text-link) hover:text-(--text-link-hover)",
        className,
      )}
    >
      <UserRound className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      View doctor profile
    </Link>
  );
}
