"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  fetchAdminBooking,
  type AdminBooking,
  type BookingStatus,
} from "@/features/admin/lib/api/adminData";
import { relativeTime } from "@/features/admin/lib/urgentCases";

/**
 * Admin booking detail (`/admin/bookings/[bookingId]`, reached from the Overview
 * triage panel's "Open" action and from the booking queue).
 *
 * Reads `GET /v1/admin/bookings/{bookingId}` — the full record, including the
 * fields the list view has no room for: the decline trail, the intake queue
 * state that drives an escalation, and the money on the booking. It is
 * deliberately read-only: every state transition on a booking belongs to the
 * participant flows (payment verification, doctor assignment, consultation
 * start), not to an admin reaching in behind them.
 */

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_payment: "Pending payment",
  payment_submitted: "Payment submitted",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<
  BookingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending_payment: "outline",
  payment_submitted: "secondary",
  confirmed: "default",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
};

const INTAKE_LABEL: Record<string, string> = {
  pending: "Pending",
  ready: "Ready",
  in_progress: "In progress",
  need_review: "Needs review",
};

function formatTimestamp(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatAmount(cents?: number, currency?: string): string {
  if (cents === undefined || !currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export default function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/bookings"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{bookingId}</h1>
          <p className="text-sm text-muted-foreground">
            Full booking record as the platform holds it.
          </p>
        </div>
      </div>

      <AsyncView<AdminBooking>
        fetcher={() => fetchAdminBooking(idToken ?? "", bookingId)}
        deps={[idToken, bookingId]}
      >
        {(booking) => <BookingDetail booking={booking} />}
      </AsyncView>
    </section>
  );
}

function BookingDetail({ booking }: { booking: AdminBooking }) {
  const intake = booking.intakeQueueStatus;

  return (
    <div data-slot="admin-booking-detail" className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[booking.status]}>
              {STATUS_LABEL[booking.status] ?? booking.status}
            </Badge>
            {intake && (
              <Badge variant={intake === "need_review" ? "destructive" : "outline"}>
                Intake: {INTAKE_LABEL[intake] ?? intake}
              </Badge>
            )}
            {!booking.doctorId && <Badge variant="outline">Unassigned</Badge>}
          </div>
          <CardTitle className="pt-2">Booking</CardTitle>
          <CardDescription>
            Scheduled {formatTimestamp(booking.scheduledAt)} ·{" "}
            {relativeTime(booking.scheduledAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Patient" value={booking.patientId} />
          <Field label="Doctor" value={booking.doctorId ?? "Unassigned"} />
          <Field
            label="Consultation"
            value={booking.consultationId ?? "Not started"}
          />
          <Field
            label="Service"
            value={booking.serviceType.replace(/_/g, " ")}
            capitalize
          />
          <Field label="Channel" value={booking.channel} capitalize />
          <Field
            label="Mode"
            value={(booking.bookingMode ?? "scheduled").replace(/_/g, " ")}
            capitalize
          />
          <Field
            label="Amount"
            value={formatAmount(booking.amountCents, booking.currency)}
          />
          <Field label="Created" value={formatTimestamp(booking.createdAt)} />
          <Field label="Last updated" value={formatTimestamp(booking.updatedAt)} />
        </CardContent>
      </Card>

      {booking.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Patient notes</CardTitle>
            <CardDescription>
              Submitted by the patient when booking.
            </CardDescription>
          </CardHeader>
          {/* Rendered as plain text, never as markup — patient-authored content. */}
          <CardContent className="text-sm whitespace-pre-wrap">
            {booking.notes}
          </CardContent>
        </Card>
      )}

      {booking.declinedBy && (
        <Card>
          <CardHeader>
            <CardTitle>Declined by doctor</CardTitle>
            <CardDescription>
              {booking.declinedBy} · {formatTimestamp(booking.declinedAt)}
            </CardDescription>
          </CardHeader>
          {booking.declineReason && (
            // In-app only: never forwarded to email/SMS and never logged.
            <CardContent className="text-sm whitespace-pre-wrap">
              {booking.declineReason}
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notification outbox</CardTitle>
          <CardDescription>
            Every email and SMS the platform emitted for this booking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={`/admin/notifications?bookingId=${encodeURIComponent(booking.bookingId)}`}
              >
                <Bell className="h-4 w-4" />
                View outbox
              </Link>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-medium break-all ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
