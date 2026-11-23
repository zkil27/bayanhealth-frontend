/**
 * Validates a `returnTo` query value so a back arrow can send the user to the
 * page that opened it (clinical remarks Nov 16: back from a closed
 * conversation landed on the chat list, which the nav no longer shows).
 *
 * Only same-origin, absolute app paths under `scope` are accepted, so the param
 * can never become an open redirect (`//evil.com`, `https://…`, `/\evil`).
 */
export function safeReturnTo(value: string | null | undefined, scope: "/patient/" | "/doctor/"): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith(scope)) return null;
  if (trimmed.startsWith("//") || trimmed.includes("\\")) return null;
  // Reject control characters and anything a URL parser would treat as a new origin.
  if (/[\u0000-\u001f]/.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed, "https://app.invalid");
    if (parsed.origin !== "https://app.invalid") return null;
    if (!parsed.pathname.startsWith(scope)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

/** Appends `returnTo` to an in-app href. */
export function withReturnTo(href: string, returnTo: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}
