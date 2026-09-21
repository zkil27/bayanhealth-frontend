import Link from "next/link";
import { AppLogo } from "@/components/primitives/Logo/AppLogo";
import { SignInForm } from "./forms/SignInForm";
import { SignUpFlow } from "./SignUpFlow";
import { cn } from "@/lib/utils";

interface AuthBoxProps {
  type: "sign up" | "sign in";
}

export function AuthBox({ type }: AuthBoxProps) {
  const isSignIn = type === "sign in";

  return (
    <div className="mx-auto flex w-full max-w-md sm:max-w-lg flex-1 flex-col justify-center min-h-0 py-1 sm:py-2 px-3 sm:px-0">
      {/* Centered Brand Logo above the card on the warm satin background */}
      <div className="flex justify-center pb-2 sm:pb-3 shrink-0">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <AppLogo type="withText" width={150} height={30} />
        </Link>
      </div>

      {/* Main Card: Consistent container size with solid surface and crisp border */}
      <div
        className={cn(
          "w-full rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-5 py-4.5 sm:px-6 sm:py-5 shadow-(--shadow-card) flex flex-col justify-between overflow-hidden",
          isSignIn
            ? "min-h-[480px] sm:min-h-[520px] max-h-[calc(100dvh-4rem)]"
            : "h-[660px] sm:h-[685px] max-h-[calc(100dvh-2.5rem)]",
        )}
      >
        {isSignIn ? (
          <>
            <div className="flex-1 flex flex-col justify-center min-h-0 overflow-y-auto">
              <SignInForm />
            </div>

            <div className="mt-3 shrink-0 flex flex-col gap-1 border-t border-(--border-subtle) pt-2.5 text-center">
              <p className="text-center text-xs text-(--text-muted)">
                New to BayanHealth?{" "}
                <Link
                  href="signUp"
                  className="font-semibold text-(--text-heading) hover:text-(--text-link-hover) hover:underline"
                >
                  Create an account
                </Link>
              </p>

              <p className="text-center text-[10px] text-(--text-subtle)">
                By signing in, you agree to our{" "}
                <Link href="/privacy" className="underline hover:text-(--text-muted)">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </>
        ) : (
          <SignUpFlow />
        )}
      </div>
    </div>
  );
}
