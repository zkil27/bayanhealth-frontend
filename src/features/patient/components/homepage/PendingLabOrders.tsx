"use client";

import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";

import { useAuthStore } from "@/stores/useAuthStore";
import {
  fetchMyLabOrders,
  type LabOrder,
} from "@/features/patient/lib/api/patientLabOrders";

import { LabResultUploadButton } from "./LabResultUploadButton";

/**
 * "Section B" of the care-plan column: lab / diagnostic orders the patient still
 * has something to do about — upload a result, or wait on a review.
 *
 * Real end to end: the order is written by the ordering physician, the list is
 * `GET /v1/patients/me/lab-orders`, and "Upload result" runs the presign → PUT →
 * confirm flow against the private bucket. Completed orders drop off; if nothing
 * is outstanding the section renders nothing so the card stays tight.
 */
export function PendingLabOrders() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const { data } = useQuery({
    queryKey: ["patient-lab-orders", idToken],
    queryFn: () => fetchMyLabOrders(idToken ?? ""),
    enabled: !!idToken,
    staleTime: 1000 * 60 * 2,
    retry: false,
    throwOnError: false,
  });

  const outstanding = (data ?? [])
    .filter((o) => o.status !== "completed")
    .slice(0, 3);

  if (outstanding.length === 0) return null;

  return (
    <div
      data-slot="patient-home-lab-orders"
      className="flex flex-col gap-2 border-t border-(--widget-care-border)/35 pt-3"
    >
      <p className="flex items-center gap-1.5 text-[12px] font-bold tracking-(--tracking-overline) text-(--widget-care-fg)/85 uppercase">
        <FlaskConical className="size-3.5" />
        Pending lab orders
      </p>
      <ul className="flex flex-col gap-2">
        {outstanding.map((order) => (
          <LabOrderRow key={order.labOrderId} order={order} />
        ))}
      </ul>
    </div>
  );
}

function LabOrderRow({ order }: { order: LabOrder }) {
  return (
    <li className="rounded-(--radius-md) border border-(--widget-care-border)/25 bg-(--surface-card) px-3 py-2.5">
      <p className="text-[13.5px] font-bold text-(--text-heading)">
        {order.testName}
      </p>
      <p className="mt-0.5 text-[12px] text-(--text-subtle)">
        Ordered {formatDate(order.orderedAt)}
      </p>

      {order.status === "under_review" ? (
        <p className="mt-1.5 text-[12.5px] font-semibold text-(--status-available-fg)">
          Result uploaded · under review
        </p>
      ) : (
        <LabResultUploadButton order={order} />
      )}
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "recently";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}
