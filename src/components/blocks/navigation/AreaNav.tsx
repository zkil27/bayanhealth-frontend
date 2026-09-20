"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { permittedAreas } from "@/lib/navigation";
import { useSession } from "@/stores/useAuthStore";

type AreaNavProps = {
  /** Optional extra classes for the nav container. */
  className?: string;
};

/**
 * Shared role-gated area navigation.
 *
 * Renders a link for every area permitted by the current session's roles and
 * for no other area (Requirements 6.2, 6.3). The permitted set is computed by
 * the pure {@link permittedAreas} helper, so the rendered targets always equal
 * `permittedAreas(session.roles)`.
 *
 * When there is no authenticated session (or it holds no recognised role) the
 * component renders nothing.
 */
export function AreaNav({ className }: AreaNavProps) {
  const session = useSession();
  const pathname = usePathname();

  const areas = permittedAreas(session?.roles ?? []);
  if (areas.length === 0) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Areas" className={cn("flex items-center gap-2", className)}>
      {areas.map((area) => (
        <Link
          key={area.id}
          href={area.href}
          prefetch={true}
          aria-current={isActive(area.href) ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            "text-foreground hover:bg-primary hover:text-primary-foreground",
            isActive(area.href) && "bg-primary text-primary-foreground",
          )}
        >
          {area.label}
        </Link>
      ))}
    </nav>
  );
}

export default AreaNav;
