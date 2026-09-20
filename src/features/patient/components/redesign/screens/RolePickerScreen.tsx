import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, HeartPulse, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { BrandButton, Screen } from "../primitives";

/** Figma S5 — sign-up role picker (step 1 of 4). */
export function RolePickerScreen() {
  return (
    <Screen className="min-h-[720px]">
      <div className="flex flex-col px-6 py-6">
        <div className="flex items-center gap-3.5 pb-5">
          <button
            type="button"
            aria-label="Back"
            className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-(--border-default) bg-(--surface-card) text-(--text-heading)"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between text-[14px] text-(--text-muted)">
              <span className="font-semibold">Step 1 of 4</span>
              <span>Role</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-(--ink-100)">
              <div className="h-full w-1/4 rounded-full bg-(--action-primary)" />
            </div>
          </div>
        </div>

        <h1 className="font-display pb-1.5 text-[26px] leading-[1.12] tracking-[-0.01em] text-(--text-heading)">
          Mag-sign up bilang?
        </h1>
        <p className="pb-5 text-[16px] text-(--text-muted)">
          Piliin kung paano mo gagamitin ang BayanHealth.
        </p>

        <div className="flex flex-col gap-3.5">
          <RoleCard
            selected
            iconTone="teal"
            icon={<User />}
            title="Pasyente"
            body="Mag-book ng appointment at kumonsulta sa licensed doctor mula sa bahay."
          />
          <RoleCard
            iconTone="navy"
            icon={<HeartPulse />}
            title="Doktor"
            body="Magbigay ng quality care, i-manage ang sarili mong schedule, matulungan ang mas maraming pasyente."
          />
        </div>

        <BrandButton full size="sm" className="mt-5" iconRight={<ArrowRight />}>
          Continue
        </BrandButton>
        <p className="mt-4 text-center text-[16px] text-(--text-muted)">
          May account ka na?{" "}
          <span className="font-semibold text-(--text-heading)">Sign in</span>
        </p>
      </div>
    </Screen>
  );
}

function RoleCard({
  selected,
  icon,
  iconTone,
  title,
  body,
}: {
  selected?: boolean;
  icon: ReactNode;
  iconTone: "teal" | "navy";
  title: string;
  body: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-[22px] bg-(--surface-card) p-[18px] shadow-(--shadow-card)",
        selected
          ? "border-2 border-(--action-primary)"
          : "border border-(--border-default)",
      )}
    >
      <span
        className={cn(
          "flex size-[52px] items-center justify-center rounded-[14px] [&_svg]:size-[26px]",
          iconTone === "teal"
            ? "bg-(--teal-100) text-(--teal-800)"
            : "bg-(--navy-100) text-(--text-heading)",
        )}
      >
        {icon}
      </span>
      {selected && (
        <span className="absolute top-4 right-4 flex size-[22px] items-center justify-center rounded-[11px] bg-(--action-primary) text-white">
          <Check className="size-3.5" />
        </span>
      )}
      <p className="mt-3.5 text-[18px] font-bold tracking-[-0.01em] text-(--text-heading)">
        {title}
      </p>
      <p className="mt-1 text-[16px] leading-[1.5] text-(--text-muted)">{body}</p>
    </div>
  );
}
