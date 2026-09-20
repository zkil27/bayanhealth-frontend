"use client";

import { useId, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import {
  submitWaitlistSignup,
  waitlistFieldErrorsFrom,
  type WaitlistFieldErrors,
} from "@/lib/waitlist";

import {
  WAITLIST_CONTENT,
  WAITLIST_SEGMENTS,
  type WaitlistSegment,
} from "./content";
import { LandingButtonFill, landingButtonClass } from "./LandingButton";

const fieldClass =
  "min-h-11 w-full rounded-(--radius-md) border border-(--border-default) bg-(--surface-card) px-3 text-[15px] text-(--text-body) transition-colors placeholder:text-(--text-subtle) focus-visible:border-(--border-focus) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-60";

type SubmitState = "idle" | "submitting" | "success" | "error";

export interface WaitlistSectionProps {
  /** Anchor id, so the nav and footer can link to it. */
  id?: string;
  /** Fixes the role and hides the selector — used by the organisation page. */
  lockedSegment?: WaitlistSegment;
  heading?: string;
  body?: string;
}

export function WaitlistSection({
  id = "waitlist",
  lockedSegment,
  heading = WAITLIST_CONTENT.heading,
  body = WAITLIST_CONTENT.body,
}: WaitlistSectionProps) {
  const fieldId = useId();
  const [state, setState] = useState<SubmitState>("idle");
  const [fieldErrors, setFieldErrors] = useState<WaitlistFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string>(
    WAITLIST_CONTENT.errorBody,
  );
  // Held in state rather than left to the DOM so a failed submit re-renders the
  // form with everything the visitor typed still in it.
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [role, setRole] = useState<WaitlistSegment>(
    lockedSegment ?? WAITLIST_SEGMENTS[0].value,
  );

  const submitting = state === "submitting";
  const showOrganisation = role === "ORGANIZATION";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setState("submitting");
    setFieldErrors({});
    setErrorMessage(WAITLIST_CONTENT.errorBody);

    try {
      await submitWaitlistSignup({
        email,
        fullName,
        role,
        // Sent only when it applies, so the endpoint never stores a stray
        // organisation name against a patient signup.
        ...(showOrganisation && organizationName
          ? { organizationName }
          : {}),
      });
      setState("success");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          // Field-keyed messages are worth showing inline; anything else
          // falls through to the generic banner below.
          setFieldErrors(waitlistFieldErrorsFrom(err));
        } else if (err.status === 429) {
          setErrorMessage(WAITLIST_CONTENT.rateLimitedBody);
        }
      }
      // Any other case (network failure, 500, etc.) keeps the generic banner
      // set above.
      setState("error");
    }
  }

  function fieldError(name: keyof WaitlistFieldErrors) {
    return fieldErrors[name]?.[0];
  }

  return (
    <section
      id={id}
      aria-labelledby={`${fieldId}-heading`}
      className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-14 lg:px-8 lg:py-20"
    >
      <div className="flex flex-col gap-6 rounded-(--radius-card) border border-(--gradient-brand-end) bg-(--surface-card) p-6 shadow-(--shadow-card) sm:p-8">
        <div className="flex flex-col gap-2">
          <span className="w-fit rounded-(--radius-pill) bg-(--surface-accent-soft) px-3 py-1 text-xs font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
            {WAITLIST_CONTENT.eyebrow}
          </span>
          <h2
            id={`${fieldId}-heading`}
            className="font-display text-2xl font-bold text-(--text-heading) md:text-3xl"
          >
            {heading}
          </h2>
          <p className="text-[15px] leading-relaxed text-(--text-muted)">
            {body}
          </p>
        </div>

        {state === "success" ? (
          <div
            data-slot="waitlist-success"
            role="status"
            className="flex items-start gap-3 rounded-(--radius-md) border border-(--border-brand) bg-(--surface-brand-soft) p-4"
          >
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-(--status-available-fg)"
              aria-hidden
            />
            <div className="flex flex-col gap-1">
              <p className="font-display text-lg font-bold text-(--text-heading)">
                {WAITLIST_CONTENT.successHeading}
              </p>
              <p className="text-[15px] leading-relaxed text-(--text-muted)">
                {WAITLIST_CONTENT.successBody}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${fieldId}-name`}
                className="text-sm font-bold text-(--text-heading)"
              >
                {WAITLIST_CONTENT.nameLabel}
              </label>
              <input
                id={`${fieldId}-name`}
                name="fullName"
                type="text"
                required
                disabled={submitting}
                autoComplete="name"
                aria-invalid={Boolean(fieldError("fullName"))}
                placeholder={WAITLIST_CONTENT.namePlaceholder}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={fieldClass}
              />
              {fieldError("fullName") && (
                <p className="text-sm text-(--danger-fg)">
                  {fieldError("fullName")}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${fieldId}-email`}
                className="text-sm font-bold text-(--text-heading)"
              >
                {WAITLIST_CONTENT.emailLabel}
              </label>
              <input
                id={`${fieldId}-email`}
                name="email"
                type="email"
                required
                disabled={submitting}
                autoComplete="email"
                aria-invalid={Boolean(fieldError("email"))}
                placeholder={WAITLIST_CONTENT.emailPlaceholder}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
              />
              {fieldError("email") && (
                <p className="text-sm text-(--danger-fg)">
                  {fieldError("email")}
                </p>
              )}
            </div>

            {!lockedSegment && (
              <fieldset disabled={submitting} className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold text-(--text-heading)">
                  {WAITLIST_CONTENT.segmentLabel}
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {WAITLIST_SEGMENTS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-(--radius-pill) border px-3 text-center text-sm font-medium transition-colors has-[:checked]:border-(--border-brand) has-[:checked]:bg-(--surface-accent-soft) has-[:checked]:font-bold has-[:checked]:text-(--status-available-fg) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring) ${
                        role === option.value
                          ? "border-(--border-brand)"
                          : "border-(--border-default) text-(--text-muted) hover:bg-(--action-secondary-hover-surface)"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={role === option.value}
                        onChange={() => setRole(option.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {showOrganisation && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${fieldId}-org`}
                  className="text-sm font-bold text-(--text-heading)"
                >
                  {WAITLIST_CONTENT.organisationLabel}
                </label>
                <input
                  id={`${fieldId}-org`}
                  name="organizationName"
                  type="text"
                  disabled={submitting}
                  autoComplete="organization"
                  placeholder={WAITLIST_CONTENT.organisationPlaceholder}
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  className={fieldClass}
                />
              </div>
            )}

            {state === "error" && (
              <p
                data-slot="waitlist-error"
                role="alert"
                className="rounded-(--radius-md) border border-(--danger-border) bg-(--danger-bg) p-3 text-sm text-(--danger-fg)"
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={landingButtonClass(
                "primary",
                "sm",
                "disabled:cursor-not-allowed disabled:opacity-70",
              )}
            >
              <LandingButtonFill variant="primary" />
              <span className="relative z-10 inline-flex items-center gap-2">
                {submitting ? (
                  <>
                    <Spinner className="size-4" />
                    {WAITLIST_CONTENT.submittingLabel}
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden />
                    {state === "error"
                      ? WAITLIST_CONTENT.retryLabel
                      : WAITLIST_CONTENT.submitLabel}
                  </>
                )}
              </span>
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
