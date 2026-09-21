"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MailCheck,
} from "lucide-react";

import { brandButtonClass } from "@/features/patient/components/redesign/primitives";
import { signIn, resendCode, CognitoError } from "@/lib/cognito";
import { storeRefreshToken } from "@/lib/session-restore";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  doctor: "/doctor",
  patient: "/patient",
};

/**
 * Resolve the post-sign-in destination from a `?next=` parameter.
 *
 * `SessionGuard` appends the path the user was bounced off so they land back
 * where they were instead of on their role home. Only same-origin absolute paths
 * are accepted — anything protocol-relative, absolute-URL, or otherwise
 * off-origin falls back to the role home, so the parameter cannot be used as an
 * open redirect.
 */
export function resolveSignInDestination(
  next: string | null,
  roleHome: string,
): string {
  if (!next) return roleHome;
  if (!next.startsWith("/")) return roleHome;
  if (next.startsWith("//")) return roleHome;
  return next;
}

/**
 * Mapped Cognito failure states for `InitiateAuth`/`USER_PASSWORD_AUTH`.
 * Kept as a discriminated union rather than raw error codes so each branch
 * carries exactly the data its notice needs (e.g. the email to resend to).
 */
type SignInErrorState =
  | { kind: "not-authorized" }
  | { kind: "rate-limited" }
  | { kind: "unconfirmed"; email: string }
  | { kind: "generic"; message: string }
  | null;

const inputClass =
  "w-full h-12 rounded-xl border border-(--border-default) bg-(--surface-card) pr-4 pl-10 text-base sm:text-sm text-(--text-heading) outline-none transition-colors placeholder:text-(--text-subtle) focus:border-(--action-primary) focus:ring-2 focus:ring-(--focus-ring)/30";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const primaryRole = useAuthStore((s) => s.primaryRole);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorState, setErrorState] = useState<SignInErrorState>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorState({
        kind: "generic",
        message: "Please enter your email and password.",
      });
      return;
    }

    setErrorState(null);
    setResent(false);
    setLoading(true);

    try {
      const tokens = await signIn(email, password);
      // Cookie custody and in-memory identity must change as one logical session
      // transition. If custody fails, do not admit the new identity: a reload
      // could otherwise restore the previous cookie's account while the UI still
      // appears to be signed in as this one.
      const refreshTokenStored = await storeRefreshToken(tokens.refreshToken);
      if (!refreshTokenStored) {
        throw new Error("Refresh-token custody failed");
      }
      setSession(tokens, email);
      const role = primaryRole() ?? "patient";
      const roleHome = ROLE_HOME[role] ?? "/patient";
      router.push(
        resolveSignInDestination(searchParams.get("next"), roleHome),
      );
    } catch (err) {
      if (err instanceof CognitoError) {
        if (err.code === "UserNotConfirmedException") {
          setErrorState({ kind: "unconfirmed", email });
        } else if (err.code === "NotAuthorizedException") {
          setErrorState({ kind: "not-authorized" });
        } else if (
          err.code === "LimitExceededException" ||
          err.code === "TooManyRequestsException"
        ) {
          setErrorState({ kind: "rate-limited" });
        } else {
          setErrorState({ kind: "generic", message: err.message });
        }
      } else {
        setErrorState({
          kind: "generic",
          message: "Sign in failed. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (errorState?.kind !== "unconfirmed") return;
    setResending(true);
    try {
      await resendCode(errorState.email);
      setResent(true);
    } catch {
      // Nothing actionable here beyond letting the person retry — the /confirm
      // page owns its own resend affordance if this one fails.
    } finally {
      setResending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4"
      noValidate
    >
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-(--text-heading)">
          Welcome Back
        </h1>
        <p className="mt-1 text-sm text-(--text-muted)">
          Sign in to access your portal.
        </p>
      </div>

      {errorState?.kind === "not-authorized" && (
        <div className="space-y-1 rounded-2xl border border-(--danger-border) bg-(--danger-bg) p-4 text-xs text-(--danger-fg)">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Incorrect email or password</span>
          </div>
          <p className="pl-5.5">
            Please double-check your credentials. For your protection, we
            don&apos;t specify which one was incorrect.
          </p>
        </div>
      )}

      {errorState?.kind === "rate-limited" && (
        <div className="space-y-1 rounded-2xl border border-(--status-soon-fg)/30 bg-(--status-soon-bg) p-4 text-xs text-(--status-soon-fg)">
          <div className="flex items-center gap-1.5 font-bold">
            <Clock className="size-4 shrink-0" />
            <span>Too many login attempts</span>
          </div>
          <p className="pl-5.5">
            Your sign-in has been temporarily paused for security. Please
            wait a few minutes before trying again.
          </p>
        </div>
      )}

      {errorState?.kind === "unconfirmed" && (
        <div className="space-y-2 rounded-2xl border border-(--status-soon-fg)/30 bg-(--status-soon-bg) p-4 text-xs text-(--status-soon-fg)">
          <div className="flex items-center gap-1.5 font-bold">
            <MailCheck className="size-4 shrink-0" />
            <span>Email address not yet verified</span>
          </div>
          <p className="pl-5.5">
            Your account exists, but {errorState.email} hasn&apos;t been
            confirmed yet. Enter the code we sent, or send a new one.
          </p>
          <div className="flex gap-2 pt-1 pl-5.5">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/confirm?email=${encodeURIComponent(errorState.email)}`,
                )
              }
              className={brandButtonClass({ size: "sm", className: "flex-1" })}
            >
              Enter code
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className={brandButtonClass({
                variant: "outline",
                size: "sm",
                className: "flex-1",
              })}
            >
              {resending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : resent ? (
                "Code sent"
              ) : (
                "Resend code"
              )}
            </button>
          </div>
        </div>
      )}

      {errorState?.kind === "generic" && (
        <p className="rounded-2xl bg-(--danger-bg) px-3 py-2 text-sm text-(--danger-fg)">
          {errorState.message}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-(--text-heading)">
          Email
        </span>
        <span className="relative flex items-center">
          <Mail className="pointer-events-none absolute left-3.5 size-4 text-(--text-subtle)" />
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputClass}
          />
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-(--text-heading)">
          Password
        </span>
        <span className="relative flex items-center">
          <Lock className="pointer-events-none absolute left-3.5 size-4 text-(--text-subtle)" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={cn(inputClass, "pr-11")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1 flex size-10 items-center justify-center rounded-xl text-(--text-subtle) hover:text-(--text-heading) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className={brandButtonClass({ full: true, className: "mt-1" })}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
