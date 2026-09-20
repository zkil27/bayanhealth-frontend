"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useIdToken } from "@/stores/useAuthStore";
import { RELEASED_ARTIFACT_POLL_MS } from "../../lib/releasedArtifacts";

import {
  fetchReleasedPatientEducation,
  groupSectionsByHeading,
  type PatientEducationPayload,
} from "../../lib/api/patientEducation";

/**
 * `filipino` is the stored register value — `CdsPatientEducationSection.language`
 * in `contracts/openapi.yaml` — and is not renameable without a contract change.
 * The patient-facing display name for that same register is `Taglish`
 * (ADR-20260824-01); the identifier and the label deliberately diverge.
 */
type Language = "english" | "filipino";

/**
 * The patient's view of their released education (ADR-20260806-04).
 *
 * Renders nothing at all until a physician releases an article. That is the
 * intended behaviour and the reason there is no empty state here: education
 * before release does not exist as far as the patient is concerned, and a card
 * saying "your doctor has not shared anything" invites a patient to chase a
 * clinician over a step that may never apply to their consultation.
 *
 * Two things are shown that the older placeholder generation could not provide:
 * a language toggle over reviewed English and Taglish text — not a machine
 * translation — and the citation, which is mandatory for corpus-backed content
 * (ADR-20260804-01) so a patient can see what the advice rests on.
 */

export function PatientEducationCard({
  consultationId,
  poll = false,
}: {
  consultationId?: string;
  /**
   * Re-check for a release on an interval. Set by the booking page while the
   * consultation is `in_progress` or `completed` -- the only window in which a
   * physician can release anything -- so an old booking left open in a tab does
   * not poll forever.
   */
  poll?: boolean;
}) {
  const idToken = useIdToken();
  const [language, setLanguage] = useState<Language>("english");

  const { data, isLoading } = useQuery({
    queryKey: ["patient-education", consultationId, idToken],
    queryFn: () => fetchReleasedPatientEducation(idToken ?? "", consultationId ?? ""),
    enabled: !!idToken && !!consultationId,
    // Short while the patient is waiting: the whole point of polling is to
    // notice a release, and a 5-minute stale window would hide it.
    staleTime: poll ? 0 : 1000 * 60 * 5,
    // A release is silent -- no notification is enqueued anywhere in the
    // backend's release transaction -- and the global query client sets
    // `refetchOnWindowFocus: false`. Without this interval a patient sitting on
    // their booking page never saw released guidance appear, despite the page
    // telling them it would (ADR-20260810-05).
    refetchInterval: poll ? RELEASED_ARTIFACT_POLL_MS : false,
    refetchIntervalInBackground: poll,
    retry: false,
  });

  if (!consultationId) return null;

  if (isLoading) {
    return (
      <div
        data-slot="patient-education-loading"
        className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground"
      >
        <Spinner className="size-4" />
        Checking for guidance from your doctor…
      </div>
    );
  }

  // Nothing released. Render nothing rather than an empty state.
  if (!data) return null;

  const payload = data.payload;
  const bilingual = payload.language === "bilingual";
  const title =
    language === "filipino" && payload.titleFilipino
      ? payload.titleFilipino
      : payload.title;

  return (
    <Card data-slot="patient-education" className="border-l-4 border-l-primary">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 shrink-0 text-primary" />
            {title}
          </CardTitle>
          {bilingual ? (
            <LanguageToggle value={language} onChange={setLanguage} />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <ShieldCheck className="size-3 shrink-0" />
            Reviewed by your doctor
          </Badge>
          <span className="text-xs text-muted-foreground">
            Shared {new Date(data.releasedAt).toLocaleString()}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Sections payload={payload} language={language} />

        {payload.warningSigns.length > 0 ? (
          <WarningSigns signs={payload.warningSigns} language={language} bilingual={bilingual} />
        ) : null}

        {payload.citation ? (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Source: </span>
              {payload.citation}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LanguageToggle({
  value,
  onChange,
}: {
  value: Language;
  onChange: (next: Language) => void;
}) {
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Reading language"
    >
      {(["english", "filipino"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "min-h-9 rounded-md border px-3 text-xs font-medium capitalize transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            value === option
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-accent",
          )}
        >
          {option === "filipino" ? "Taglish" : "English"}
        </button>
      ))}
    </div>
  );
}

function Sections({
  payload,
  language,
}: {
  payload: PatientEducationPayload;
  language: Language;
}) {
  const groups = groupSectionsByHeading(payload.sections);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        // Fall back to the other language only when the requested one is absent,
        // so a partially populated article still reads rather than going blank.
        const preferred = language === "filipino" ? group.filipino : group.english;
        const fallback = language === "filipino" ? group.english : group.filipino;
        const body = preferred ?? fallback ?? group.untagged.join("\n\n");
        if (!body) return null;

        return (
          <section key={group.heading} className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold text-foreground">{group.heading}</h3>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{body}</p>
            {preferred === undefined && fallback !== undefined ? (
              <span className="text-[11px] text-muted-foreground italic">
                Not available in {language === "filipino" ? "Taglish" : "English"} yet
              </span>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Warning signs, styled as the alert they are.
 *
 * A bilingual article supplies these as [English, Taglish] in order, so the
 * toggle selects one rather than showing both — a duplicated urgent-care list is
 * harder to act on than a single one.
 */
function WarningSigns({
  signs,
  language,
  bilingual,
}: {
  signs: string[];
  language: Language;
  bilingual: boolean;
}) {
  const visible =
    bilingual && signs.length >= 2
      ? [language === "filipino" ? signs[1] : signs[0]]
      : signs;

  return (
    <div
      data-slot="patient-education-warnings"
      className="flex flex-col gap-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <AlertTriangle className="size-4 shrink-0 text-destructive" />
        When to seek urgent care
      </span>
      <ul className="ml-6 list-disc text-sm text-foreground">
        {visible.map((sign) => (
          <li key={sign}>{sign}</li>
        ))}
      </ul>
    </div>
  );
}
