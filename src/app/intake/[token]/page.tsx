"use client";

import { use, useCallback, useState } from "react";
import { CheckCircle2, LinkIcon } from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IntakeForm } from "@/features/booking/components/consultation/intake/IntakeForm";
import {
  inspectIntakeLink,
  saveIntakeDraft,
  submitIntakeForm,
  type IntakeLinkStatusResponse,
} from "@/features/booking/lib/api/intake";
import { mapIntakeFormToSections } from "@/features/booking/lib/intakeMapper";
import type { DynamicIntakeFormValues } from "@/features/booking/schemas/intakeSchema";

/**
 * Public patient intake route (`/intake/{token}`).
 *
 * The `token` is a one-time, public intake link (contract endpoints are
 * `security: []`). The page inspects the link, and — when it is active —
 * renders the multi-section intake form whose submission is wired to the real
 * deployed intake endpoints (draft per step, then submit).
 */
export default function IntakeTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  return <IntakeTokenView token={token} />;
}

function LinkUnavailable({
  linkStatus,
}: {
  linkStatus: IntakeLinkStatusResponse["linkStatus"];
}) {
  const consumed = linkStatus === "consumed";
  return (
    <Alert>
      <LinkIcon />
      <AlertTitle>
        {consumed ? "This intake link was already used" : "This intake link has expired"}
      </AlertTitle>
      <AlertDescription>
        {consumed
          ? "The form for this link has already been submitted. If you need to make changes, please contact your clinic for a new link."
          : "Intake links are valid for a limited time. Please request a new link from your clinic to complete your form."}
      </AlertDescription>
    </Alert>
  );
}

function SubmittedState() {
  return (
    <Alert>
      <CheckCircle2 />
      <AlertTitle>Intake submitted</AlertTitle>
      <AlertDescription>
        Thank you. Your intake form has been submitted to your care team. You
        can now close this page.
      </AlertDescription>
    </Alert>
  );
}

function IntakeTokenView({ token }: { token: string }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(
    async (values: DynamicIntakeFormValues) => {
      const sections = mapIntakeFormToSections(values);
      await saveIntakeDraft(token, "purpose", sections.purpose);
      await saveIntakeDraft(token, "details", sections.details);
      await saveIntakeDraft(token, "review", sections.review);
      await submitIntakeForm(token);
    },
    [token],
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-y-4 p-4 pb-32">
      <h1 className="px-1 text-2xl font-bold tracking-tight text-foreground">
        Patient Intake
      </h1>

      {submitted ? (
        <SubmittedState />
      ) : (
        <AsyncView<IntakeLinkStatusResponse>
          fetcher={() => inspectIntakeLink(token)}
          deps={[token]}
        >
          {(linkStatus) =>
            linkStatus.linkStatus === "active" ? (
              <IntakeForm
                serviceRequested="teleconsult"
                storageKey={token}
                onSubmit={handleSubmit}
                onComplete={() => setSubmitted(true)}
              />
            ) : (
              <LinkUnavailable linkStatus={linkStatus.linkStatus} />
            )
          }
        </AsyncView>
      )}
    </div>
  );
}
