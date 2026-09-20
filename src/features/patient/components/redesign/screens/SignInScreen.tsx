import { Info, Lock, Mail, Send } from "lucide-react";

import { AppLogo } from "@/components/primitives/Logo/AppLogo";
import { BrandButton, Screen, Wordmark } from "../primitives";

/** Figma S4 — email-first sign in ("Maligayang pagbabalik"). */
export function SignInScreen() {
  return (
    <Screen className="min-h-[720px]">
      <div className="flex flex-col px-6 py-9">
        <div className="flex flex-col items-center gap-3 pt-5 pb-7">
          <AppLogo type="logoOnly" width={46} height={46} />
          <Wordmark className="text-[24px]" />
        </div>

        <h1 className="font-display text-center text-[28px] leading-[1.12] tracking-[-0.01em] text-(--text-heading)">
          Maligayang pagbabalik
        </h1>
        <p className="mt-2 mb-7 text-center text-[16px] text-(--text-muted)">
          Email lang — magse-send kami ng code.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-[15px] font-medium text-(--text-body)">
            Email address
          </span>
          <span className="flex h-[52px] items-center rounded-[14px] border border-(--action-primary) bg-(--surface-card) px-3.5">
            <Mail className="size-[19px] shrink-0 text-(--teal-800)" />
            <span className="ml-2.5 truncate text-[16px] font-semibold text-(--text-heading)">
              maria.delacruz@gmail.com
            </span>
          </span>
        </label>

        <BrandButton full size="sm" className="mt-4" iconLeft={<Send />}>
          I-send ang code sa email
        </BrandButton>

        <div className="flex items-center gap-3 py-6">
          <span className="h-px flex-1 bg-(--border-default)" />
          <span className="text-[15px] text-(--text-subtle)">o</span>
          <span className="h-px flex-1 bg-(--border-default)" />
        </div>

        <BrandButton full size="sm" variant="outline" iconLeft={<Lock />}>
          Gamitin na lang ang password
        </BrandButton>

        <p className="mt-3.5 flex items-center justify-center gap-1.5 text-[15px] text-(--text-subtle)">
          <Info className="size-3.5" />
          Walang SMS sa version na ito.
        </p>

        <p className="mt-5 text-center text-[16px] text-(--text-muted)">
          Bago sa BayanHealth?{" "}
          <span className="font-semibold text-(--text-heading)">
            Mag-rehistro
          </span>
        </p>

        <p className="mt-5 text-center text-[14px] text-(--text-subtle)">
          Sa pag-sign in, sumasang-ayon ka sa aming{" "}
          <span className="font-semibold text-(--text-heading)">Terms</span> at{" "}
          <span className="font-semibold text-(--text-heading)">
            Privacy policy
          </span>
          .
        </p>
      </div>
    </Screen>
  );
}
