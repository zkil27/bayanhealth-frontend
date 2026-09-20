import { ArrowLeft, CircleCheck, Globe, ShieldCheck } from "lucide-react";

import { AppLogo } from "@/components/primitives/Logo/AppLogo";
import { BrandButton, Chip, Screen, Wordmark } from "../primitives";

const DETAILS: [string, string][] = [
  ["Issued by", "Dr. Jose Santos, Internal Medicine"],
  ["Issued at", "Jul 22, 2026 · 3:05 PM"],
  ["Valid until", "Aug 21, 2026"],
];

/** Figma P2 — public, no-sign-in prescription verification. */
export function VerifyPrescriptionScreen() {
  return (
    <Screen className="min-h-[720px]">
      <div className="flex flex-col px-6 pt-3.5 pb-6">
        <button
          type="button"
          aria-label="Back"
          className="mb-3.5 flex size-11 items-center justify-center rounded-[12px] border border-(--border-default) bg-(--surface-card) text-(--text-heading)"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="mb-5 flex items-center gap-2">
          <AppLogo type="logoOnly" width={26} height={26} />
          <Wordmark className="text-[17px]" />
        </div>

        <Chip tone="info" icon={<Globe />} className="mb-3.5 self-start">
          Public · walang sign-in
        </Chip>

        <h1 className="font-display text-[24px] tracking-[-0.01em] text-(--text-heading)">
          Verify a prescription
        </h1>
        <p className="mt-1.5 mb-4 text-[16px] leading-[1.5] text-(--text-muted)">
          I-type ang verification code sa reseta para ma-check kung galing ito sa
          licensed BayanHealth doctor.
        </p>

        <p className="mb-1.5 text-[15px] font-semibold text-(--text-body)">
          Verification code
        </p>
        <div className="min-h-16 rounded-[14px] border border-(--border-default) bg-(--surface-card) px-3.5 py-3 font-mono text-[15px] font-bold tracking-wide text-(--text-heading)">
          RX-7K2M-9QF4-BAYAN
        </div>

        <BrandButton size="sm" className="mt-4 self-start" iconLeft={<ShieldCheck />}>
          I-verify
        </BrandButton>

        <div className="mt-4.5 rounded-[14px] border border-(--teal-300) bg-(--teal-100) p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[18px] bg-(--action-primary) text-white">
              <CircleCheck className="size-5" />
            </span>
            <p className="text-[16px] font-bold text-(--teal-800)">
              Valid prescription
            </p>
          </div>
          <p className="mt-3 text-[16px] text-(--text-body)">
            Verified na tunay ang resetang ito.
          </p>
          <dl className="mt-3 flex flex-col gap-2">
            {DETAILS.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-[15px] text-(--text-muted)">{label}</dt>
                <dd className="text-right text-[15px] font-bold text-(--text-heading)">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-5 text-center text-[14px] leading-[1.5] text-(--text-subtle)">
          Ang result lang ang ipinapakita — walang personal na impormasyon ng
          pasyente.
        </p>
      </div>
    </Screen>
  );
}
