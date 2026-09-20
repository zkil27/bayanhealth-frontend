import type { ReactNode } from "react";
import { Hospital, Phone, Pill, ShieldAlert, User } from "lucide-react";

import { BrandButton, SheetShell } from "../primitives";

const STEPS: { icon: ReactNode; text: string }[] = [
  {
    icon: <Hospital />,
    text: "Pumunta sa pinakamalapit na ospital o RHU — huwag nang maghintay ng teleconsult.",
  },
  {
    icon: <User />,
    text: "Kung may kasama ka, sabihin mo agad sa kanila. Huwag mag-drive mag-isa.",
  },
  {
    icon: <Pill />,
    text: "Isama ang listahan ng gamot mo at ang care summary na ito.",
  },
];

/** Figma M3 — emergency escalation sheet (teleconsult not safe). */
export function EmergencyEscalationSheet() {
  return (
    <SheetShell tone="danger">
      <div className="flex items-center gap-3 pt-4">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] border border-(--red-600) bg-(--red-100) text-(--red-700)">
          <ShieldAlert className="size-7" />
        </span>
        <h3 className="font-display text-[20px] leading-[1.1] tracking-[-0.01em] text-(--red-700)">
          Kailangan mo ng agarang atensyon
        </h3>
      </div>

      <p className="pt-3 text-[16px] leading-[1.6] text-(--text-body)">
        Ang mga sintomas na sinabi mo ay pwedeng seryoso.{" "}
        <span className="font-semibold">
          Hindi safe ang teleconsult para dito.
        </span>{" "}
        Pumunta agad sa pinakamalapit na emergency room.
      </p>

      <BrandButton
        full
        variant="danger"
        className="mt-4 h-[52px]"
        iconLeft={<Phone />}
      >
        Call 911
      </BrandButton>

      <ul className="flex flex-col gap-2.5 pt-2.5">
        {STEPS.map((step, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-px shrink-0 text-(--red-700) [&_svg]:size-[19px]">
              {step.icon}
            </span>
            <span className="text-[15px] leading-[1.5] text-(--text-body)">
              {step.text}
            </span>
          </li>
        ))}
      </ul>

      <p className="pt-3.5 text-center text-[14px] leading-[1.5] text-(--text-subtle)">
        Hindi na-cancel ang booking mo — bumalik ka lang kapag safe ka na.{" "}
        <span className="font-semibold text-(--text-heading)">
          Hindi ito emergency
        </span>
      </p>
    </SheetShell>
  );
}
