"use client";

import { useState } from "react";
import { AlertTriangle, Siren } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useIdToken } from "@/stores/useAuthStore";
import { sendEmergencyReferral } from "../../lib/api/emergencyReferral";

/**
 * "Send patient to ER" for the assigned doctor (ADR-20261005-02). Available at
 * any point of the consultation, with no Assessment and no AI. The patient sees
 * a red alert at once. Write and sign a Clinical Referral (urgency emergency)
 * for them to bring.
 *
 * Always in the same place, but solid red only when `urgent` (a red flag or
 * safety hold is active). Solid red on every routine consult made it the
 * loudest thing on the page and taught doctors to read past red, which is the
 * one color that must keep meaning "act now".
 */
export function SendToErControl({
  bookingId,
  emergencyAdvisedAt,
  onSent,
  urgent = false,
  className,
}: {
  bookingId: string;
  emergencyAdvisedAt?: string;
  /** Called after the server records the advice, e.g. to refetch the booking. */
  onSent?: () => void;
  /** A safety finding is active: draw the control at full emphasis. */
  urgent?: boolean;
  className?: string;
}) {
  const idToken = useIdToken();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [sentAt, setSentAt] = useState<string | undefined>(undefined);

  const send = async () => {
    setPending(true);
    try {
      const booking = await sendEmergencyReferral(idToken ?? "", bookingId, note.trim());
      setSentAt(booking.emergencyAdvisedAt ?? new Date().toISOString());
      onSent?.();
      setOpen(false);
      setNote("");
      toast.success("The patient has been told to go to the ER now.", {
        description: "Write a Clinical Referral (urgency: emergency) for them to bring.",
      });
    } catch {
      toast.error("Couldn't send the ER instruction. Please try again, or call the patient.");
    } finally {
      setPending(false);
    }
  };

  const advisedAt = emergencyAdvisedAt ?? sentAt;
  if (advisedAt) {
    return (
      <p
        data-slot="er-advised"
        className={cn("flex items-center gap-1.5 text-sm font-bold text-(--danger-fg)", className)}
      >
        <Siren className="size-4" aria-hidden />
        Patient told to go to the ER at {new Date(advisedAt).toLocaleTimeString()}
      </p>
    );
  }

  return (
    <>
      <Button
        type="button"
        data-slot="send-to-er"
        disabled={pending}
        onClick={() => setOpen(true)}
        shape="pill"
        className={cn(
          "h-11 gap-1.5 px-3 font-semibold lg:h-9 lg:px-3.5",
          urgent
            ? "bg-(--danger-fg) text-white hover:bg-(--danger-fg)/90"
            : "border border-(--danger-border)/70 bg-(--surface-card) text-(--danger-fg) hover:bg-(--danger-bg)",
          className,
        )}
      >
        <Siren className="size-4" aria-hidden />
        <span className="max-lg:hidden">Send patient to ER</span>
        <span className="lg:hidden" aria-hidden>ER</span>
        <span className="sr-only lg:hidden">Send patient to ER</span>
      </Button>

      <ResponsiveSheet
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
        icon={Siren}
        iconClassName="text-(--danger-fg)"
        title="Tell the patient to go to the ER now?"
        description="They will see a red “Go to the nearest emergency room now” alert with 911 straight away."
        footer={
          <>
            <Button
              type="button"
              data-slot="send-to-er-confirm"
              shape="pill"
              disabled={pending}
              className="bg-(--danger-fg) px-5 font-semibold text-white shadow-xs hover:bg-(--danger-fg)/90 active:bg-(--danger-fg)/95 disabled:opacity-50"
              onClick={() => void send()}
            >
              {pending ? (
                <>
                  <Spinner className="mr-1.5 size-3.5" />
                  Sending…
                </>
              ) : (
                <>
                  <Siren className="size-4 shrink-0" aria-hidden />
                  Send to ER
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              shape="pill"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Not now
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5 py-1">
          <div className="flex items-start gap-2.5 rounded-xl border border-(--danger-border)/35 bg-(--danger-bg) p-3 text-xs text-(--danger-fg)">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-(--danger-fg)" aria-hidden />
            <div className="space-y-0.5">
              <p className="font-semibold text-(--danger-fg)">Immediate emergency protocol</p>
              <p className="text-[11.5px] leading-relaxed text-(--danger-fg)/90">
                This triggers a high-visibility emergency banner in the patient&apos;s app with one-tap 911 calling and urgent ER routing.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="er-note" className="text-xs font-semibold text-(--text-heading)">
              Short instruction for the patient (optional)
            </Label>
            <Textarea
              id="er-note"
              value={note}
              maxLength={500}
              rows={3}
              disabled={pending}
              placeholder="e.g. Go to the nearest ER now. Bring your ID and a companion."
              className="min-h-20 resize-none rounded-xl border-(--border-default) bg-(--surface-card) text-sm focus-visible:border-(--action-primary)"
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="flex items-center justify-between text-[11px] text-(--text-muted)">
              <span>Included in the patient&apos;s emergency alert banner</span>
              <span className="font-mono">{note.length}/500</span>
            </div>
          </div>

          <p className="text-[11.5px] leading-relaxed text-(--text-muted)">
            Write and sign a <strong className="text-(--text-body)">Clinical Referral</strong> (urgency: emergency) in the workspace deliverables for the patient to present upon arrival.
          </p>
        </div>
      </ResponsiveSheet>
    </>
  );
}
