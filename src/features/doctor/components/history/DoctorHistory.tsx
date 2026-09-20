"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CalendarOff, Clock, Stethoscope } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import type { AsyncState } from "@/lib/asyncView";
import { useIdToken } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { formatConsultationTime } from "@/lib/consultation-time";

/**
 * The doctor's real schedule for today.
 *
 * This drawer previously rendered four invented appointments — "Juan Carlos
 * 9:00 AM", "Maria Angela 10:30 AM", "Ricardo Santos 1:00 PM", "Roberto Manalo
 * 3:00 PM" — from a module constant. It sits in the doctor header, which the
 * layout renders on every doctor route, so a fabricated patient list and a
 * fabricated notification dot appeared on every screen, and the "4 appointments
 * scheduled" count was fixed regardless of the doctor's actual day.
 *
 * It now reads `GET /v1/doctors/me/intake-queue` — the same endpoint the
 * dashboard board and metrics already use — and shows only what that returns.
 *
 * A failed read is a distinct state, not an empty one. The read had no error
 * branch, so a 403/500/network failure rendered "0 consultations scheduled" and
 * "Nothing scheduled today" and suppressed the attention dot — a broken request
 * dressed up as a free day, on every doctor route, with nothing telling the
 * doctor to retry. The four states now go through {@link AsyncView} exactly as
 * `CompletedConsultations` does, so failure gets its own message and a retry.
 *
 * Patient names are deliberately absent: the queue exposes `patientId` and no
 * name, and the platform has no patient-name source for the doctor surface. An
 * entry is therefore identified by service type and booking reference, which are
 * real, rather than by a person's name, which would have to be invented.
 */

/** Shape of the fields this drawer needs from an intake-queue entry. */
interface QueueEntry {
  booking?: {
    bookingId?: string;
    scheduledAt?: string;
    serviceType?: string;
    channel?: string;
    status?: string;
  };
  intakeFormStatus?: string;
}

interface TodayItem {
  bookingId: string;
  scheduledAt: Date;
  serviceType: string;
  channel?: string;
  intakeReady: boolean;
}

/** True when `date` falls on the viewer's current local calendar day. */
function isToday(date: Date, now: Date): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function humanizeService(serviceType: string): string {
  return serviceType.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Keep only entries scheduled today, ordered by time.
 *
 * Exported for test: "which of these count as today" is the one piece of logic
 * here worth pinning, and it is timezone-sensitive.
 */
export function toTodaySchedule(
  entries: QueueEntry[],
  now: Date = new Date(),
): TodayItem[] {
  return entries
    .flatMap((entry) => {
      const booking = entry.booking;
      if (!booking?.bookingId || !booking.scheduledAt) return [];
      const scheduledAt = new Date(booking.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) return [];
      if (!isToday(scheduledAt, now)) return [];
      return [
        {
          bookingId: booking.bookingId,
          scheduledAt,
          serviceType: booking.serviceType ?? "consultation",
          channel: booking.channel,
          intakeReady: entry.intakeFormStatus === "submitted",
        },
      ];
    })
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

/** Message shown when the intake-queue read fails and no cause is available. */
export const SCHEDULE_ERROR_MESSAGE = "Couldn't load today's schedule.";

export function DoctorHistory() {
  const idToken = useIdToken();

  const query = useQuery({
    queryKey: ["doctor-today-schedule", idToken],
    queryFn: async (): Promise<TodayItem[]> => {
      const res = await api.get<QueueEntry[]>(
        "/v1/doctors/me/intake-queue",
        idToken ?? "",
      );
      return toTodaySchedule(res.data ?? []);
    },
    enabled: !!idToken,
    staleTime: 1000 * 60,
    retry: false,
  });

  // React Query owns the data lifecycle, so drive AsyncView in controlled mode
  // and let it render the standard loading / empty / error+retry slots — the
  // same four-state contract `CompletedConsultations` uses.
  //
  // The error branch is the point of this shape. Without it a 403 or a 500 on
  // `GET /v1/doctors/me/intake-queue` fell through to `data ?? []`, so a failed
  // read rendered as "0 consultations scheduled" / "Nothing scheduled today" on
  // every doctor route: a broken request presented as a free day, with nothing
  // to tell the doctor to retry.
  let state: AsyncState<TodayItem[]>;
  if (!idToken || query.isPending) {
    state = { status: "loading" };
  } else if (query.error) {
    state = {
      status: "error",
      message:
        query.error instanceof Error && query.error.message
          ? query.error.message
          : SCHEDULE_ERROR_MESSAGE,
    };
  } else if (!query.data || query.data.length === 0) {
    state = { status: "empty" };
  } else {
    state = { status: "data", value: query.data };
  }

  const appointments = state.status === "data" ? state.value : [];
  const failed = state.status === "error";
  // A real, non-empty schedule earns the attention dot — and so does a failed
  // read. Suppressing it on failure would make an unknown day look like a
  // confirmed empty one, which is the same lie the drawer body used to tell.
  const showIndicator = appointments.length > 0 || failed;

  return (
    <Drawer swipeDirection="right">
      <DrawerTrigger>
        <div className="relative cursor-pointer rounded-lg p-2 transition-all duration-300 hover:bg-primary hover:text-white">
          <Calendar />
          {showIndicator && (
            <span
              data-slot="doctor-schedule-indicator"
              data-state={failed ? "unavailable" : "scheduled"}
              aria-label={
                failed
                  ? "Today's schedule could not be loaded"
                  : "You have consultations scheduled today"
              }
              className={cn(
                "absolute right-0 bottom-0 size-4 rounded-full ring-2 ring-background",
                failed ? "bg-destructive" : "bg-orange-500",
              )}
            />
          )}
        </div>
      </DrawerTrigger>
      <DrawerContent className="flex flex-col p-0 sm:max-w-md">
        <DrawerHeader className="border-b p-6 pb-4">
          <DrawerTitle>Today&apos;s Schedule</DrawerTitle>
          <DrawerDescription>
            {state.status === "loading"
              ? "Loading your schedule…"
              : failed
                ? SCHEDULE_ERROR_MESSAGE
                : `${appointments.length} ${
                    appointments.length === 1 ? "consultation" : "consultations"
                  } scheduled`}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="h-96 flex-1 pb-5">
          <AsyncView<TodayItem[]>
            state={state}
            onRetry={() => void query.refetch()}
            loading={
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Loading…
              </div>
            }
            empty={
              <div
                data-slot="doctor-schedule-empty"
                className="flex flex-col items-center gap-2 p-8 text-center"
              >
                <CalendarOff className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Nothing scheduled today
                </p>
                <p className="text-xs text-muted-foreground">
                  Confirmed consultations assigned to you appear here.
                </p>
              </div>
            }
          >
            {(items) => (
              <div className="divide-y divide-border">
                {items.map((appointment) => (
                  <div
                    key={appointment.bookingId}
                    className="relative p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium",
                          "bg-primary/10 text-primary",
                        )}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {/*
                          Platform timezone, labelled. The doctor's own schedule
                          screen shows the wall-clock time they published; rendering
                          this in the device's zone made the same appointment read
                          differently in two places in their own UI.
                        */}
                        {formatConsultationTime(appointment.scheduledAt.toISOString())}
                      </div>
                      {appointment.intakeReady ? (
                        <Badge variant="outline">Intake ready</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Intake pending
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="mb-0.5 flex items-center gap-1.5 text-base font-semibold">
                          <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
                          {humanizeService(appointment.serviceType)}
                        </h4>
                        <p className="font-mono text-xs text-muted-foreground">
                          {appointment.bookingId}
                        </p>
                        {appointment.channel ? (
                          <p className="text-xs text-muted-foreground capitalize">
                            {appointment.channel}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      <Link
                        href={`/consultation/room/${encodeURIComponent(appointment.bookingId)}`}
                      >
                        <Button size="sm" className="h-8 text-xs">
                          Open room
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AsyncView>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
