import { Clock, Image as ImageIcon, ReceiptText } from "lucide-react";

import { BrandButton, SheetShell } from "../primitives";

/** Figma M4 — "we received your GCash receipt" confirmation sheet. */
export function ReceiptReceivedSheet() {
  return (
    <SheetShell>
      <div className="flex flex-col items-center pt-3">
        <span className="flex size-[68px] items-center justify-center rounded-[34px] bg-(--teal-100) text-(--teal-800)">
          <ReceiptText className="size-8" />
        </span>
      </div>

      <h3 className="font-display mt-4 text-center text-[22px] leading-[1.12] tracking-[-0.01em] text-(--text-heading)">
        Natanggap na namin ang resibo mo!
      </h3>

      <p className="mx-auto mt-2 max-w-[19rem] text-center text-[16px] leading-[1.6] text-(--text-muted)">
        Naka-hold ang 2:30 PM mo nang{" "}
        <span className="font-semibold text-(--text-body)">15 minuto</span>{" "}
        habang rine-review namin ang resibo. Ie-email ka namin kapag confirmed na
        — at hindi mawawala ang bayad mo kahit lumipas ang hold.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-(--border-subtle) bg-(--cream-200) px-3.5 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-(--border-subtle) bg-(--surface-card) text-(--teal-800)">
          <ImageIcon className="size-[19px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-(--text-body)">
            gcash-resibo-0623.png
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[14px] font-bold text-(--gold-700)">
            <Clock className="size-3 shrink-0" />
            Naipadala ang bayad · rine-review pa
          </p>
        </div>
      </div>

      <BrandButton full size="sm" className="mt-4">
        Sige, naiintindihan ko
      </BrandButton>
    </SheetShell>
  );
}
