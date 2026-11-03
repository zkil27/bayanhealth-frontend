"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2, CircleDashed, FlaskConical, Upload } from "lucide-react";

import { StatusText } from "@/components/ui/status-text";
import {
  fetchConsultationLabOrders,
  type LabOrder,
  type LabOrderStatus,
} from "@/features/doctor/lib/api/careContinuity";

/**
 * Lab results the patient was asked for in this consultation, and whether
 * they have uploaded them. Read-only.
 *
 * Pilot feedback (2026-11): clinicians could not tell where patient-uploaded
 * lab results show up in the chart. The doctor-side lab-orders API already
 * existed but no doctor screen read it. This lists each order with its upload
 * state in the same status vocabulary as the document checklist. Opening the
 * uploaded file itself needs a download endpoint (not in the contract yet), so
 * the row says when the result arrived rather than linking to it.
 */
const STATUS_COPY: Record<
  LabOrderStatus,
  { label: string; tone: "neutral" | "attention" | "success"; icon: typeof CircleDashed }
> = {
  pending_upload: { label: "Waiting for patient upload", tone: "neutral", icon: CircleDashed },
  under_review: { label: "Uploaded, needs your review", tone: "attention", icon: Upload },
  completed: { label: "Reviewed", tone: "success", icon: CheckCircle2 },
};

export function LabResultsSection({
  consultationId,
  token,
}: {
  consultationId?: string;
  token?: string;
}) {
  const [orders, setOrders] = useState<LabOrder[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!consultationId || !token) return;
    let cancelled = false;
    void fetchConsultationLabOrders(consultationId, token)
      .then((next) => {
        if (!cancelled) setOrders(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [consultationId, token]);

  if (!consultationId || !token) return null;

  return (
    <section
      aria-labelledby="rail-lab-results-heading"
      data-slot="rail-lab-results"
      className="border-t border-(--border-subtle) px-3.5 py-3"
    >
      <h3
        id="rail-lab-results-heading"
        className="flex items-center gap-1.5 text-sm font-bold text-(--text-heading)"
      >
        <FlaskConical className="size-4 shrink-0 text-(--teal-700)" aria-hidden />
        Lab results
      </h3>

      {failed ? (
        <p className="mt-1.5 text-sm text-(--text-muted)">
          Lab results could not be loaded. Refresh the page to try again.
        </p>
      ) : orders === null ? (
        <p className="mt-1.5 text-sm text-(--text-muted)">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="mt-1.5 text-sm text-(--text-muted)">
          No lab tests were requested in this consultation.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-(--border-subtle)">
          {orders.map((order) => {
            const status = STATUS_COPY[order.status] ?? STATUS_COPY.pending_upload;
            return (
              <li key={order.labOrderId} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
                <span className="text-sm font-semibold text-(--text-body)">{order.testName}</span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusText tone={status.tone} icon={status.icon}>
                    {status.label}
                  </StatusText>
                  {order.hasResult && order.resultUploadedAt ? (
                    <span className="text-xs text-(--text-muted)">
                      Uploaded {formatDate(order.resultUploadedAt)}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}
