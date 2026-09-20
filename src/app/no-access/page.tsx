"use client";

import Link from "next/link";

/**
 * No-role destination (Requirement 4.6).
 *
 * An authenticated session whose `cognito:groups` resolve to no recognised
 * application role is routed here by the route guard instead of `/signIn`,
 * which would otherwise produce a redirect loop.
 */
export default function NoAccessPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-y-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">No area assigned</h1>
      <p className="text-muted-foreground">
        Your account is signed in but has not been assigned to a role yet, so there
        are no areas available to you. Please contact an administrator to have a role
        assigned to your account.
      </p>
      <Link
        href="/signIn"
        className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Back to sign in
      </Link>
    </section>
  );
}
