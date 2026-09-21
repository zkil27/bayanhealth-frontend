import Link from "next/link";
import { AppLogo } from "@/components/primitives/Logo/AppLogo";
import ModeToggle from "@/components/blocks/ModeToggle";
import { SignInForm } from "./forms/SignInForm";
import { SignUpFlow } from "./SignUpFlow";

interface AuthBoxProps {
  type: "sign up" | "sign in";
}

export function AuthBox({ type }: AuthBoxProps) {
  const isSignIn = type === "sign in";

  return (
    <div className="flex w-full flex-1 flex-col justify-between sm:justify-center sm:flex-initial sm:max-w-lg min-h-0 sm:py-2">
      {/* Mobile Top Bar: Logo + Theme Toggle */}
      <div className="flex items-center justify-between w-full px-4 pt-3 pb-1.5 sm:hidden shrink-0">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <AppLogo type="withText" width={135} height={28} />
        </Link>
        <div className="scale-90 origin-right">
          <ModeToggle />
        </div>
      </div>

      {/* Desktop Logo above card */}
      <div className="hidden sm:flex justify-center pb-3 shrink-0">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <AppLogo type="withText" width={150} height={30} />
        </Link>
      </div>

      {/* Main Container: Full-screen mobile canvas, centered card on desktop */}
      <div className="flex flex-1 flex-col justify-between min-h-0 w-full overflow-hidden bg-(--surface-card) px-4 pb-2 sm:px-6 sm:py-5 sm:flex-initial sm:rounded-2xl sm:border sm:border-(--border-subtle) sm:shadow-(--shadow-card)">
        {isSignIn ? (
          <>
            <div className="flex-1 flex flex-col justify-center min-h-0 overflow-y-auto">
              <SignInForm />
            </div>

            <div className="mt-3 shrink-0 flex flex-col gap-1 border-t border-(--border-subtle) pt-2.5 pb-2 text-center">
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
