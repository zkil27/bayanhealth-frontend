"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardList } from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { displayBookingStatus, hasNextPage } from "@/lib/bookings";
import { useAuthStore } from "@/stores/useAuthStore";

import { formatConsultationDateTime } from "@/lib/consultation-time";

import {
  fetchBookingPage,
  type BookingListItem,
  type BookingListPage,
} from "../../lib/api/bookingList";

/**
 * Backend-wired patient booking list (Slice 5, task 10.4).
 *
 * Renders `GET /v1/bookings` through {@link AsyncView}, which standardises the
 * four states this requirement needs:
 * - loading: a defined loading indicator while the request is in flight;
 * - data: the returned bookings, each with a defined status label (Req 10.1);
 * - empty: a defined empty state on zero bookings (Requirement 10.2);
 * - error: a defined error state with a retry control on failure or the 10s
 *   timeout (Requirement 10.3).
 *
 * Pagination uses the opaque cursor in `meta.pagination.cursor`: the next-page
 * control is rendered only when {@link hasNextPage} is `true`, and clicking it
 * loads and appends the next page using that cursor (Requirements 10.9, 10.10).
 */
export function PatientBookingList({ limit }: { limit?: number }) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  // Cursor of the page currently being fetched (undefined = first page).
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  // Bookings accumulated across the pages loaded so far, deduped by bookingId.
  const accumulatedRef = useRef<BookingListItem[]>([]);

  const fetcher = useCallback(async (): Promise<BookingListPage> => {
    const page = await fetchBookingPage(idToken ?? "", cursor, limit);
    // The first page (no cursor) restarts accumulation; subsequent pages append.
    const base = cursor ? accumulatedRef.current : [];
    const seen = new Set(base.map((b) => b.bookingId));
    const merged = [...base];
    for (const booking of page.bookings) {
      if (!seen.has(booking.bookingId)) {
        seen.add(booking.bookingId);
        merged.push(booking);
      }
    }
    accumulatedRef.current = merged;
    return { bookings: merged, meta: page.meta };
  }, [idToken, cursor]);

  return (
    <AsyncView<BookingListPage>
      fetcher={fetcher}
      deps={[idToken, cursor]}
      isEmpty={(page) => page.bookings.length === 0}
      empty={<PatientBookingListEmpty />}
    >
      {(page) => (
        <div
          data-slot="patient-booking-list"
          className="flex flex-col gap-2"
        >
          <ul className="flex flex-col gap-3">
            {page.bookings.map((booking) => (
              <BookingRow key={booking.bookingId} booking={booking} />
            ))}
          </ul>

          {hasNextPage(page.meta) ? (
            <div className="flex justify-center pt-2">
              <Button
                data-slot="booking-list-next-page"
                size="sm"
                onClick={() => setCursor(page.meta.pagination?.cursor)}
              >
                Load more bookings
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </AsyncView>
  );
}

function BookingRow({ booking }: { booking: BookingListItem }) {
  const status = displayBookingStatus(booking.status, !!booking.declinedBy);
  return (
    <li data-slot="patient-booking-item">
      <Link
        href={`/patient/booking/getBooking/${booking.bookingId}`}
        className="flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/50"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-semibold text-foreground">
            {formatServiceType(booking.serviceType)}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4 shrink-0" />
            {formatScheduledAt(booking.scheduledAt)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            #{booking.bookingId}
          </span>
        </div>
        <Badge
          data-slot="booking-status"
          variant="outline"
          data-tone={status.tone}
        >
          {status.label}
        </Badge>
      </Link>
    </li>
  );
}

function PatientBookingListEmpty() {
  return (
    <Empty data-slot="patient-booking-list-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardList />
        </EmptyMedia>
        <EmptyTitle>No bookings yet</EmptyTitle>
        <EmptyDescription>
          You don&apos;t have any bookings yet. Once you book a consultation it
          will appear here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Present the contract `serviceType` enum as a readable label. */
function formatServiceType(serviceType?: string): string {
  if (!serviceType) return "Consultation";
  return serviceType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Present a consultation instant in the platform timezone.
 *
 * This used to be a private `toLocaleString(undefined, …)` here, duplicated
 * verbatim in the other list, and different again in two more places — all
 * rendering in the *viewer's* zone with no label. A slot is authored as
 * doctor-local wall clock and resolved as Asia/Manila, so a patient abroad was
 * shown a different clock time than the doctor published. See
 * `lib/consultation-time.ts`.
 */
function formatScheduledAt(scheduledAt?: string): string {
  return formatConsultationDateTime(scheduledAt);
}
