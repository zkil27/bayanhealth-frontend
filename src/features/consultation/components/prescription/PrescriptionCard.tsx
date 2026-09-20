"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info, Pill, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { formatConsultationDateTime } from "@/lib/consultation-time";
import { useIdToken } from "@/stores/useAuthStore";
import { RELEASED_ARTIFACT_POLL_MS } from "../../lib/releasedArtifacts";

import {
  fetchReleasedPrescription,
  isPlaceholderMedication,
  isPlaceholderPrescription,
  type PrescriptionMedication,
} from "../../lib/api/releasedPrescription";

/**
 * The patient's view of their released prescription (ADR-20260809-01).
 *
 * Renders nothing until a physician releases one, for the same reason the
 * education card does: a prescription before release does not exist as far as the
 * patient is concerned, and a card saying "your doctor has not prescribed
 * anything" invites a patient to chase a clinician over a step that may never
 * apply. The "awaiting your doctor" message lives once, in the wizard's terminal
 * step, rather than being repeated by every card that has nothing to show.
 *
 * Two things this card is careful about.
 *
 * **It does not pretend to be a dispensable script.** The response carries no
 * prescriber identity, licence number, or signature, and nothing in it is
 * verifiable by a pharmacy, so the card says so plainly instead of letting the
 * patient assume they can present it at a counter.
 *
 * **It refuses to present the deterministic fallback as medicine.** When the
 * provider fails a gate, times out, or returns an empty completion,
 * `protected-generation.ts` emits `genericName: "physician selection required"`
 * with every other field `"not specified"` — and returns HTTP 200 while doing so.
 * If that reaches a patient it must read as "your doctor has not finished this",
 * never as a drug and a dose. This is a presentation guard, not a substitute for
 * the physician reviewing the artifact before releasing it.
 */
export function PrescriptionCard({
  consultationId,
  poll = false,
}: {
  consultationId?: string;
  /** See {@link PatientEducationCard}: polls only while a release is possible. */
  poll?: boolean;
}) {
  const idToken = useIdToken();

  const { data, isLoading } = useQuery({
    queryKey: ["released-prescription", consultationId, idToken],
    queryFn: () => fetchReleasedPrescription(idToken ?? "", consultationId ?? ""),
    enabled: !!idToken && !!consultationId,
    // See PatientEducationCard: same silent-release problem, same fix.
    staleTime: poll ? 0 : 1000 * 60 * 5,
    refetchInterval: poll ? RELEASED_ARTIFACT_POLL_MS : false,
    refetchIntervalInBackground: poll,
    retry: false,
  });

  if (!consultationId) return null;

  if (isLoading) {
    return (
      <div
        data-slot="prescription-loading"
        className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground"
      >
        <Spinner className="size-4" />
        Checking for a prescription from your doctor…
      </div>
    );
  }

  // Nothing released. Render nothing rather than an empty state.
  if (!data) return null;

  const payload = data.payload;
  const incomplete = isPlaceholderPrescription(payload);

  return (
    <Card data-slot="prescription-card" className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Pill className="size-4 shrink-0 text-primary" />
          Your prescription
          <Badge variant="outline" className="gap-1 font-normal">
            <ShieldCheck className="size-3" />
            Released by your doctor
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Shared {formatConsultationDateTime(data.releasedAt)}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {incomplete ? (
          <Alert variant="destructive" data-slot="prescription-incomplete">
            <AlertTriangle className="size-4" />
            <AlertTitle>Your doctor has not finished this yet</AlertTitle>
            <AlertDescription className="text-xs">
              No medicine has been selected on this prescription. Please message
              your doctor in the consultation chat before acting on it, and do not
              take anything based on this page.
            </AlertDescription>
          </Alert>
        ) : (
          <ul className="flex flex-col gap-3" data-slot="prescription-medications">
            {payload.medications.map((medication, index) => (
              <MedicationRow
                key={`${medication.genericName}-${index}`}
                medication={medication}
              />
            ))}
          </ul>
        )}

        {payload.notes ? (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-foreground">
                Notes from your doctor
              </p>
              <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                {payload.notes}
              </p>
            </div>
          </>
        ) : null}

        <Alert>
          <Info className="size-4" />
          <AlertDescription className="text-xs">
            This is your record of what your doctor prescribed during the
            consultation. It is not a signed prescription document and cannot be
            presented at a pharmacy on its own — ask your doctor in the chat if
            you need a dispensable copy.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

/**
 * One medication.
 *
 * Every field is rendered with its own label rather than concatenated into a
 * sentence: dose, route, frequency, and duration are separate clinical facts, and
 * running them together is how a patient misreads "500 mg" and "three times
 * daily" as one instruction.
 *
 * A single placeholder row inside an otherwise real prescription is labelled
 * rather than hidden, because silently dropping a row would misrepresent what the
 * physician released.
 */
function MedicationRow({ medication }: { medication: PrescriptionMedication }) {
  if (isPlaceholderMedication(medication)) {
    return (
      <li className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Incomplete entry.</span>{" "}
        Your doctor has not selected a medicine for this line. Ask them about it
        in the consultation chat.
      </li>
    );
  }

  return (
    <li className="rounded-lg border bg-muted/40 p-3">
      <p className="text-sm font-semibold text-foreground">
        {medication.genericName}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <Field label="Dose" value={medication.dose} />
        <Field label="How to take it" value={medication.route} />
        <Field label="How often" value={medication.frequency} />
        <Field label="For how long" value={medication.duration} />
      </dl>
      {medication.instructions ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {medication.instructions}
        </p>
      ) : null}
    </li>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
