"use client";

import { PrescriptionPagedContent } from "./PrescriptionPagedContent";
import type { PrescriptionPreviewData } from "./prescriptionPreview";

interface PrescriptionPagedPreviewProps {
  data: PrescriptionPreviewData;
  variant?: "draft" | "finalized";
}

export function PrescriptionPagedPreview({
  data,
  variant = "finalized",
}: PrescriptionPagedPreviewProps) {
  return (
    <div className="w-[210mm] p-0">
      <PrescriptionPagedContent data={data} variant={variant} />
    </div>
  );
}
