import type { ReactNode } from "react";
import { Banknote, Check, FileText, Lock, Stethoscope } from "lucide-react";

import { BrandButton, SheetShell } from "../primitives";

const POINTS: { icon: ReactNode; text: ReactNode }[] = [
  {
    icon: <Stethoscope />,
    text: "Konsulta ito sa licensed doctor — hindi ito emergency service.",
  },
  {
    icon: <Lock />,
    text: "Private ang impormasyon mo. Ikaw at ang doktor mo lang ang may access sa clinical record.",
  },
  {
    icon: <FileText />,
    text: "Ang doktor ang magdedesisyon kung angkop ang reseta, med cert, o referral.",
  },
  {
    icon: <Banknote />,
    text: "May refund kung hindi matuloy ang konsulta dahil sa amin.",
  },
];

/** Figma M1 — pre-consultation consent bottom sheet. */
export function ConsentSheet() {
  return (
    <SheetShell>
      <h3 className="font-display pt-4 text-[20px] tracking-[-0.01em] text-(--text-heading)">
        Bago tayo magpatuloy
      </h3>
      <p className="pt-1.5 text-[16px] leading-[1.5] text-(--text-muted)">
        Basahin ang mahahalagang punto — sa simpleng salita.
      </p>

      <ul className="flex flex-col gap-2.5 pt-4">
        {POINTS.map((point, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-px shrink-0 text-(--teal-800) [&_svg]:size-[17px]">
              {point.icon}
            </span>
            <span className="text-[15px] leading-[1.5] text-(--text-body)">
              {point.text}
            </span>
          </li>
        ))}
      </ul>

      <label className="mt-4 flex items-start gap-3 rounded-[14px] bg-(--teal-100) px-3.5 py-3">
        <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] bg-(--action-primary) text-white">
          <Check className="size-3.5" />
        </span>
        <span className="text-[15px] leading-[1.5] text-(--text-body)">
          Nabasa ko at sumasang-ayon ako sa{" "}
          <span className="font-semibold text-(--text-heading)">
            Terms of service
          </span>{" "}
          at{" "}
          <span className="font-semibold text-(--text-heading)">
            Privacy notice
          </span>
          .
        </span>
      </label>

      <BrandButton full size="sm" className="mt-4">
        Sumasang-ayon ako — magpatuloy
      </BrandButton>
      <BrandButton full size="sm" variant="ghost" className="mt-2">
        Basahin ang buong terms
      </BrandButton>
    </SheetShell>
  );
}
