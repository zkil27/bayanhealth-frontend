"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  ADMIN_LIST_PAGE_SIZE,
  fetchAdminBookingsByStatus,
  type AdminBooking,
  type BookingStatus,
} from "@/features/admin/lib/api/adminData";
import { relativeTime } from "@/features/admin/lib/urgentCases";

/**
 * Admin booking queue (`/admin/bookings`).
 *
 * `GET /v1/admin/bookings` is a per-status queue rather than a general search,
 * so the status filter is the page's primary control and each selection is one
 * request. This is the list half of the list → detail pair the triage panel on
 * the Overview links into.
 */

const STATUS_TABS: { status: BookingStatus; label: string }[] = [
  { status: "payment_submitted", label: "Payment submitted" },
  { status: "confirmed", label: "Confirmed" },
  { status: "in_progress", label: "In progress" },
  { status: "pending_payment", label: "Pending payment" },
  { status: "completed", label: "Completed" },
  { status: "cancelled", label: "Cancelled" },
];

/** Badge treatment per lifecycle status, paired with the status text itself. */
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

function statusLabel(status: BookingStatus): string {
  return STATUS_TABS.find((t) => t.status === status)?.label ?? status;
}

function formatSchedule(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminBookingsPage() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const [status, setStatus] = useState<BookingStatus>("payment_submitted");

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          The operational queue, filtered by where each booking sits in its
          lifecycle.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{statusLabel(status)}</CardTitle>
          <CardDescription>
            Up to the {ADMIN_LIST_PAGE_SIZE} most recent bookings in this status.
          </CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            {STATUS_TABS.map((tab) => (
              <Button
                key={tab.status}
                size="sm"
                variant={tab.status === status ? "default" : "outline"}
                aria-pressed={tab.status === status}
                onClick={() => setStatus(tab.status)}
                className={cn("shrink-0")}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <AsyncView<AdminBooking[]>
            fetcher={() => fetchAdminBookingsByStatus(idToken ?? "", status)}
            deps={[idToken, status]}
            isEmpty={(bookings) => bookings.length === 0}
            empty={<BookingsEmpty status={status} />}
          >
            {(bookings) => (
              <Table data-slot="admin-bookings-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow
                      key={booking.bookingId}
                      data-slot="admin-booking-row"
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/bookings/${encodeURIComponent(booking.bookingId)}`}
                          className="text-primary hover:underline"
                        >
                          {booking.bookingId}
                        </Link>
                      </TableCell>
                      <TableCell>{formatSchedule(booking.scheduledAt)}</TableCell>
                      <TableCell className="capitalize">
                        {booking.serviceType.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {booking.doctorId ?? "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[booking.status]}>
                          {statusLabel(booking.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {relativeTime(booking.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AsyncView>
        </CardContent>
      </Card>
    </section>
  );
}

function BookingsEmpty({ status }: { status: BookingStatus }) {
  return (
    <Empty data-slot="admin-bookings-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarClock />
        </EmptyMedia>
        <EmptyTitle>No bookings in this status</EmptyTitle>
        <EmptyDescription>
          Nothing is currently {statusLabel(status).toLowerCase()}.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
