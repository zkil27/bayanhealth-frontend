import { ArrowLeft, UserX } from "lucide-react";

import { BrandButton, Screen } from "../primitives";

/** Figma Y1 — authenticated session with no assigned role. */
export function NoAreaAssignedScreen() {
  return (
    <Screen className="min-h-[560px]">
      <div className="flex flex-col items-center px-8 py-9 text-center">
        <span className="flex size-[72px] items-center justify-center rounded-[18px] bg-(--ink-100) text-(--text-muted)">
          <UserX className="size-9" />
        </span>

        <h1 className="font-display mt-5 text-[26px] leading-[1.12] tracking-[-0.01em] text-(--text-heading)">
          Walang naka-assign na area
        </h1>
        <p className="mx-auto mt-2.5 max-w-[19rem] text-[16px] leading-[1.6] text-(--text-muted)">
          Naka-sign in ang account mo, pero wala pang naka-assign na role — kaya
          walang available na area. Kontakin ang administrator para ma-assign ka.
        </p>

        <BrandButton size="sm" className="mt-6" iconLeft={<ArrowLeft />}>
          Back to sign in
        </BrandButton>

        <p className="mt-5 text-[16px] text-(--text-subtle)">
          Need tulong?{" "}
          <span className="font-semibold text-(--text-heading)">
            I-contact ang support
          </span>
        </p>
      </div>
    </Screen>
  );
}
