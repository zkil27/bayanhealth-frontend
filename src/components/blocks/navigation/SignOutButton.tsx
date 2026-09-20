"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSignOut } from "@/hooks/use-sign-out";

type SignOutButtonProps = {
  /** Optional extra classes for the control. */
  className?: string;
  /** Visual variant; defaults to a subtle ghost button. */
  variant?: React.ComponentProps<typeof Button>["variant"];
  /** Button size; defaults to the standard size. */
  size?: React.ComponentProps<typeof Button>["size"];
  /** Hide the text label and render an icon-only control. */
  iconOnly?: boolean;
  iconClassName ?: string;
  /** Override the visible label. */
  label?: string;
};

/**
 * Reusable sign-out control.
 *
 * Modular by design so it can be composed into the shared area navigation
 * (task 6.1), the patient/doctor headers, or the admin shell. It delegates all
 * behaviour to {@link useSignOut}: clearing the session and `bayan-auth` cookie,
 * routing to `/signIn` on success, and surfacing an error while retaining the
 * session on failure (Requirements 6.4–6.6).
 */
export function SignOutButton({
  className,
  variant = "ghost",
  size = "default",
  iconOnly = false,
  iconClassName,
  label = "Sign out",
}: SignOutButtonProps) {
  const { signOut, pending } = useSignOut();

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? "icon" : size}
      disabled={pending}
      aria-label={iconOnly ? label : undefined}
      onClick={() => {
        void signOut();
      }}
      className={cn(className)}
    >
      <LogOut aria-hidden="true" className={`${iconClassName}`}/>
      {!iconOnly && <span>{pending ? "Signing out…" : label}</span>}
    </Button>
  );
}

export default SignOutButton;
