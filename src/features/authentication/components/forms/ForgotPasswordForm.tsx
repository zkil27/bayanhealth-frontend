"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Circle, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, MailCheck } from "lucide-react";

import { brandButtonClass } from "@/features/patient/components/redesign/primitives";
import { confirmForgotPassword, forgotPassword } from "@/lib/cognito";
import { cn } from "@/lib/utils";

import { PASSWORD_RULES, passwordMeetsRules, resetErrorMessage, type ResetStep } from "../../lib/passwordReset";

const inputClass =
  "w-full h-12 rounded-xl border border-(--border-default) bg-(--surface-card) pr-4 pl-10 text-base text-(--text-heading) outline-none transition-colors placeholder:text-(--text-subtle) focus:border-(--action-primary) focus:ring-2 focus:ring-(--focus-ring)/30 aria-invalid:border-(--danger-border)";

/**
 * Forgot Password (pilot feedback). Two steps on one screen, like the sign-in
 * card it sits in: email, then the emailed code plus a new password. Uses
 * Cognito's public `ForgotPassword` / `ConfirmForgotPassword` actions.
 *
 * The first step never says whether an email has an account: an unknown
 * address gets the same "If an account exists…" message as a real one.
 */
export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const sendCode = async (resend = false) => {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError("Enter the email address you use to sign in.");
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      setStep("confirm");
      setInfo(resend ? "We sent a new code. Use the newest email." : null);
    } catch (err) {
      const message = resetErrorMessage("request", err);
      if (message) setError(message);
      else setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setAttempted(true);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    if (!passwordMeetsRules(password)) {
      setError("Your new password doesn't meet every rule below yet.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await confirmForgotPassword(email.trim(), code.trim(), password);
      router.replace("/signIn?reset=1");
    } catch (err) {
      setError(resetErrorMessage("confirm", err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      noValidate
      className="flex w-full flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void (step === "request" ? sendCode() : changePassword());
      }}
    >
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-(--text-heading)">
          {step === "request" ? "Reset your password" : "Check your email"}
        </h1>
        <p className="mt-1 text-base text-(--text-muted)">
          {step === "request" ? (
            "Enter your email and we'll send you a 6-digit code."
          ) : (
            <>
              If an account exists for <span className="font-semibold text-(--text-body)">{email.trim()}</span>, we sent a 6-digit code. It can take a minute to arrive.
            </>
          )}
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl border border-(--danger-border) bg-(--danger-bg) px-4 py-3 text-sm font-medium text-(--danger-fg)">
          {error}
        </p>
      ) : null}
      {info ? (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-(--safe-bg) px-4 py-3 text-sm font-medium text-(--safe-fg)">
          <MailCheck aria-hidden className="size-4 shrink-0" />
          {info}
        </p>
      ) : null}

      {step === "request" ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-(--text-heading)">Email</span>
          <span className="relative flex items-center">
            <Mail aria-hidden className="pointer-events-none absolute left-3.5 size-4 text-(--text-subtle)" />
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </span>
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-(--text-heading)">Code from the email</span>
            <span className="relative flex items-center">
              <KeyRound aria-hidden className="pointer-events-none absolute left-3.5 size-4 text-(--text-subtle)" />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                className={cn(inputClass, "font-mono tracking-[0.3em]")}
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-(--text-heading)">New password</span>
            <span className="relative flex items-center">
              <Lock aria-hidden className="pointer-events-none absolute left-3.5 size-4 text-(--text-subtle)" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby="new-password-rules"
                aria-invalid={(attempted && !passwordMeetsRules(password)) || undefined}
                className={cn(inputClass, "pr-12")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 flex size-11 items-center justify-center rounded-xl text-(--text-subtle) hover:text-(--text-heading) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
              >
                {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
              </button>
            </span>
          </label>

          <ul id="new-password-rules" aria-label="Password rules" className="grid gap-1 text-sm sm:grid-cols-2">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(password);
              return (
                <li key={rule.id} className={cn("flex items-center gap-2", met ? "text-(--safe-fg)" : "text-(--text-muted)")}>
                  {met ? <Check aria-hidden className="size-4 shrink-0" /> : <Circle aria-hidden className="size-3.5 shrink-0" />}
                  {rule.label}
                  <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
                </li>
              );
            })}
          </ul>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-(--text-heading)">Type the new password again</span>
            <span className="relative flex items-center">
              <Lock aria-hidden className="pointer-events-none absolute left-3.5 size-4 text-(--text-subtle)" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                aria-invalid={(attempted && confirm !== password) || undefined}
                className={inputClass}
              />
            </span>
          </label>
        </>
      )}

      <button type="submit" disabled={loading} className={brandButtonClass({ full: true, className: "mt-1 min-h-12" })}>
        {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
        {step === "request" ? (loading ? "Sending code…" : "Send code") : loading ? "Changing password…" : "Change password"}
      </button>

      {step === "confirm" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={() => void sendCode(true)}
            disabled={loading}
            className="min-h-11 font-semibold text-(--text-link) hover:text-(--text-link-hover) hover:underline disabled:opacity-60"
          >
            Send a new code
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("request");
              setCode("");
              setError(null);
              setInfo(null);
            }}
            className="min-h-11 font-medium text-(--text-muted) hover:text-(--text-heading) hover:underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <Link
          href="/signIn"
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-(--text-link) hover:text-(--text-link-hover) hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" /> Back to sign in
        </Link>
      )}
    </form>
  );
}
