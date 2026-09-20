"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { BellIcon, SearchIcon } from "lucide-react";

import { AsyncView } from "@/components/async-view";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  fetchNotificationEvents,
  type NotificationDeliveryStatus,
  type NotificationEvent,
} from "@/features/admin/lib/api/adminData";

/**
 * Admin notification outbox viewer.
 *
 * The real notifications endpoint is admin-scoped to a booking (a notification
 * outbox), not a per-user feed. This page therefore takes a `bookingId` and
 * lists the outbox entries for that booking through {@link AsyncView}, which
 * standardises the four defined states (loading → data | empty | error).
 *
 * Fetching is gated on a submitted, non-empty `bookingId`: before one is
 * entered the page shows an instructional idle state (not an error). The id is
 * validated roughly against the contract pattern `^bk_[a-z0-9]+$`; an invalid
 * value surfaces a gentle inline hint and is never sent to the backend.
 */

/** Contract pattern for a booking id (`NotificationEvent.bookingId`). */
const BOOKING_ID_PATTERN = /^bk_[a-z0-9]+$/;

function isValidBookingId(value: string): boolean {
  return BOOKING_ID_PATTERN.test(value.trim());
}

function deliveryStatusMeta(status: NotificationDeliveryStatus | string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (status) {
    case "sent":
      return { label: "Sent", variant: "default" };
    case "outbox":
      return { label: "Outbox", variant: "secondary" };
    case "skipped":
      return { label: "Skipped", variant: "outline" };
    case "failed":
      return { label: "Failed", variant: "destructive" };
    default:
      return { label: status || "Unknown", variant: "outline" };
  }
}

const ROLE_LABEL: Record<string, string> = {
  patient: "Patient",
  doctor: "Doctor",
  admin: "Admin",
};

function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Wrapped in a Suspense boundary because the outbox reads `?bookingId=` — the
 * deep link the admin booking detail hands over — and `useSearchParams` opts a
 * client component into that boundary.
 */
export default function AdminNotificationsPage() {
  return (
    <React.Suspense fallback={null}>
      <NotificationsOutbox />
    </React.Suspense>
  );
}

function NotificationsOutbox() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  // Arriving from /admin/bookings/[bookingId] carries the booking, so the
  // operator does not have to copy an id across two screens.
  const linkedBookingId = useSearchParams().get("bookingId")?.trim() ?? "";
  const prefill = isValidBookingId(linkedBookingId) ? linkedBookingId : "";

  const [inputValue, setInputValue] = React.useState(prefill);
  const [submittedBookingId, setSubmittedBookingId] = React.useState(prefill);
  const [showHint, setShowHint] = React.useState(false);

  const trimmed = inputValue.trim();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidBookingId(trimmed)) {
      setShowHint(true);
      return;
    }
    setShowHint(false);
    setSubmittedBookingId(trimmed);
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Notification Outbox</h1>
        <p className="text-sm text-muted-foreground">
          Inspect the notification events emitted for a specific booking.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Look up a booking</CardTitle>
          <CardDescription>
            Notifications are scoped to a booking, so enter a booking id to view
            its outbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2"
            data-slot="admin-notifications-form"
          >
            <Label htmlFor="bookingId">Booking ID</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex w-full flex-col gap-1">
                <Input
                  id="bookingId"
                  name="bookingId"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (showHint) setShowHint(false);
                  }}
                  placeholder="bk_..."
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={showHint || undefined}
                  aria-describedby="bookingId-hint"
                  className="sm:max-w-sm"
                />
                <p
                  id="bookingId-hint"
                  className={
                    showHint
                      ? "text-xs text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {showHint
                    ? "That doesn't look like a booking id. It should look like bk_… (lowercase letters and numbers)."
                    : "A booking id looks like bk_… (e.g. bk_abc123)."}
                </p>
              </div>
              <Button type="submit" className="shrink-0">
                <SearchIcon />
                Load
              </Button>
            </div>
          </form>

          {submittedBookingId ? (
            <AsyncView<NotificationEvent[]>
              fetcher={() =>
                fetchNotificationEvents(idToken ?? "", submittedBookingId)
              }
              deps={[idToken, submittedBookingId]}
              isEmpty={(events) => events.length === 0}
              empty={<NotificationsEmpty bookingId={submittedBookingId} />}
            >
              {(events) => (
                <Table data-slot="admin-notifications-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => {
                      const status = deliveryStatusMeta(event.deliveryStatus);
                      return (
                        <TableRow
                          key={event.notificationId}
                          data-slot="admin-notification-row"
                        >
                          <TableCell className="font-medium">
                            {event.template}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {event.channel === "sms" ? "SMS" : "Email"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {event.recipientRole
                              ? (ROLE_LABEL[event.recipientRole] ??
                                event.recipientRole)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {event.subject ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDateTime(event.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </AsyncView>
          ) : (
            <NotificationsIdle />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function NotificationsIdle() {
  return (
    <Empty data-slot="admin-notifications-idle">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BellIcon />
        </EmptyMedia>
        <EmptyTitle>Enter a booking id to begin</EmptyTitle>
        <EmptyDescription>
          Provide a booking id above and select Load to view its notification
          outbox.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function NotificationsEmpty({ bookingId }: { bookingId: string }) {
  return (
    <Empty data-slot="admin-notifications-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BellIcon />
        </EmptyMedia>
        <EmptyTitle>No notifications for this booking</EmptyTitle>
        <EmptyDescription>
          The outbox for {bookingId} has no notification events yet.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
