import Link from "next/link";
import { AppLogo } from "@/components/primitives/Logo/AppLogo";
import { SignInForm } from "./forms/SignInForm";
import { SignUpFlow } from "./SignUpFlow";

interface AuthBoxProps {
  type: "sign up" | "sign in";
}

const cardClass =
  "w-full rounded-t-[28px] sm:rounded-(--radius-card) border-t border-x sm:border border-(--border-subtle) bg-(--surface-card) px-6 pt-4 pb-8 sm:p-8 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] sm:shadow-(--shadow-card)";

export function AuthBox({ type }: AuthBoxProps) {
  const isSignIn = type === "sign in";

  return (
    <div className="mx-auto flex w-full max-w-105 flex-1 flex-col justify-end sm:justify-center">
      <div className="my-auto flex justify-center py-6 sm:my-0 sm:pb-6">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <AppLogo type="withText" width={190} height={38} />
        </Link>
      </div>

      <div className={cardClass}>
        {/* Visual modal sheet drag handle for mobile viewports */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-(--border-default) sm:hidden" />

        {isSignIn ? <SignInForm /> : <SignUpFlow />}

        {isSignIn ? (
          <div className="mt-5 flex flex-col gap-2 border-t border-(--border-subtle) pt-4">
            <p className="text-center text-sm text-(--text-muted)">
              New to BayanHealth?{" "}
              <Link
                href="signUp"
                className="font-semibold text-(--text-heading) hover:text-(--text-link-hover) hover:underline"
              >
                Create an account
              </Link>
            </p>

            <p className="text-center text-[11px] text-(--text-subtle)">
              By signing in, you agree to our{" "}
              <Link href="/privacy" className="underline hover:text-(--text-muted)">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-5 border-t border-(--border-subtle) pt-4">
            <p className="text-center text-sm text-(--text-muted)">
              Already have an account?{" "}
              <Link
                href="signIn"
                className="font-semibold text-(--text-heading) hover:text-(--text-link-hover) hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
