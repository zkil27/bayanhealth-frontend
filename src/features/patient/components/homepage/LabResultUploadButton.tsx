"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/useAuthStore";
import {
  isLabResultContentType,
  uploadLabResult,
  type LabOrder,
} from "@/features/patient/lib/api/patientLabOrders";

/**
 * The presign → PUT → confirm upload flow for one lab order, as a standalone
 * control.
 *
 * Extracted out of `PendingLabOrders.tsx` so the same button, mutation, and
 * validation back both places a patient can act on a pending result: the
 * `/patient/health` lab-orders list and the Care Recovery Roadmap's lab branch
 * on `/patient`. Keeping one copy means both success paths invalidate the same
 * `["patient-lab-orders"]` query key and neither silently drifts on the file
 * type / size limits.
 */
const ACCEPT = ".pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

export function LabResultUploadButton({
  order,
  className,
}: {
  order: LabOrder;
  className?: string;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => {
      if (!isLabResultContentType(file.type)) {
        throw new Error("Use a PDF, JPG, PNG, or WEBP file.");
      }
      if (file.size > MAX_BYTES) {
        throw new Error("File must be 10 MB or smaller.");
      }
      return uploadLabResult(idToken ?? "", order.labOrderId, file, file.type);
    },
    onSuccess: () => {
      setError(null);
      // The upload is a real POST with a real outcome — silently invalidating
      // the query and letting the step re-render on its own next paint is not
      // visible feedback. A brief, explicit confirmation is what tells the
      // patient the action actually went through, matching how every other
      // async write on this page (`toast.success` in the doctor scheduler)
      // confirms itself.
      toast.success("Result uploaded — your doctor will review it.");
      void queryClient.invalidateQueries({ queryKey: ["patient-lab-orders"] });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Upload failed.";
      setError(message);
      toast.error(message);
    },
  });

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        aria-busy={upload.isPending}
        // 44px minimum touch target (was `min-h-9`/36px) with a 12px
        // horizontal negative margin match so the visible pill doesn't shift.
        className="mt-1.5 inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-pill) border border-(--action-primary) px-3 text-[12.5px] font-bold text-(--status-available-fg) transition-colors duration-200 ease-in-out hover:bg-(--surface-accent-soft) disabled:opacity-60 sm:mt-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        {upload.isPending ? (
          <Loader2 aria-hidden className="size-3.5 animate-spin" />
        ) : (
          <Upload aria-hidden className="size-3.5" />
        )}
        {upload.isPending ? "Uploading…" : "Upload result"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload.mutate(file);
        }}
      />
      {error ? (
        <p className="mt-1 text-[12px] text-(--danger-fg)">{error}</p>
      ) : null}
    </div>
  );
}
