import Image from "next/image";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  width: number;
  height: number;
  type?: "withText" | "logoOnly";
  /**
   * Theme variant:
   * - "auto": renders both light and dark SVGs toggled via CSS (`dark:hidden` / `hidden dark:block`).
   * - "light": forces the light version (navy "Bayan", teal "Health"), ideal for white document sheets.
   * - "dark": forces the dark version (white "Bayan", teal "Health"), ideal for always-dark containers.
   */
  variant?: "auto" | "light" | "dark";
  className?: string;
  priority?: boolean;
}

const logoMapLight = {
  withText: "/BayanHealthLogoWithText2.svg",
  logoOnly: "/BayanHealthLogo.svg",
};

const logoMapDark = {
  withText: "/BayanHealthLogoWithTextDark.svg",
  logoOnly: "/BayanHealthLogo.svg",
};

/**
 * The BayanHealth mark and wordmark, sized by width with aspect ratio preserved.
 *
 * Dark mode support is native: `type="withText"` switches the "Bayan" wordmark
 * to crisp white on dark surfaces while preserving the authentic full-color
 * Teal and Navy logomark. Do NOT use `dark:brightness-0 dark:invert`, which
 * destroys the logomark by turning its teal bubble and inner stethoscope into a
 * flat 1-bit white silhouette.
 */
export function AppLogo({
  width,
  height,
  type = "logoOnly",
  variant = "auto",
  className,
  priority = false,
}: AppLogoProps) {
  if (type === "withText" && variant === "auto") {
    return (
      <span className={cn("inline-flex shrink-0 items-center", className)}>
        <Image
          src={logoMapLight.withText}
          alt="BayanHealth"
          width={width}
          height={height || width}
          style={{ width, height: "auto" }}
          className="dark:hidden"
          priority={priority}
          unoptimized
        />
        <Image
          src={logoMapDark.withText}
          alt="BayanHealth"
          width={width}
          height={height || width}
          style={{ width, height: "auto" }}
          className="hidden dark:block"
          priority={priority}
          unoptimized
        />
      </span>
    );
  }

  const logoSrc = variant === "dark" ? logoMapDark[type] : logoMapLight[type];

  return (
    <Image
      src={logoSrc}
      alt="BayanHealth"
      width={width}
      height={height || width}
      style={{ width, height: "auto" }}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}

export function AppLogoInHeader() {
  return (
    <>
      <Image
        src={logoMapLight["logoOnly"]}
        alt="BayanHealth"
        width={40}
        height={40}
        className="block h-10 w-auto sm:hidden"
        priority
        unoptimized
      />
      <Image
        src={logoMapLight["withText"]}
        alt="BayanHealth"
        width={120}
        height={40}
        className="hidden h-10 w-auto sm:block dark:hidden"
        priority
        unoptimized
      />
      <Image
        src={logoMapDark["withText"]}
        alt="BayanHealth"
        width={120}
        height={40}
        className="hidden h-10 w-auto dark:sm:block"
        priority
        unoptimized
      />
    </>
  );
}
