"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, Clock, Inbox, MessageSquare, Zap } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useIdToken } from "@/stores/useAuthStore";
import { NumberTicker } from "@/components/primitives/NumberTicker";

import {
  acceptRequest,
  fetchRequestPool,
  type OnDemandRequest,
} from "../lib/api/requestPool";
import { DOCTOR_INTAKE_QUEUE_QUERY_KEY } from "../hooks/usePatientBoard";
import { LIVE_QUEUE_POLL_INTERVAL_MS } from "../lib/pollIntervals";
import { QUEUE_SECTION_CLASS, queueSectionHeaderClass } from "./homepage/queueCard";

function formatAmount(amountCents?: number, currency?: string): string | null {
  if (typeof amountCents !== "number" || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

function serviceLabel(serviceType: OnDemandRequest["serviceType"]): string {
  return serviceType.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Maximum rows shown before collapsing to an "N more" link, matching the card
 * cap the rest of the dashboard enforces (design note: no card scrolls
 * internally — the page scrolls once).
 */
const VISIBLE_REQUEST_CAP = 4;

/**
 * Doctor-facing on-demand consultation request pool (ADR-20260805-04).
 *
 * Rendered as a standalone dashboard card so it mounts independently of the
 * intake-queue's own loading/empty state. It used to live *inside*
 * `DoctorDashboardBoard`'s "booking requests" column, so
 * `DoctorDashboardClient` treating a zero-length intake queue as the board's
 * empty state rendered `<BoardEmpty />` in its place — the pool disappeared
 * completely on the one doctor account most likely to have open pool requests
 * and nothing else: an idle one. This card has its own query, its own loading
 * skeleton, and its own error boundary, so nothing about the intake queue's
 * state can hide it.
 *
 * The pool is broadcast: every approved doctor sees the same unclaimed requests
 * and the first to accept wins. Losing that race is normal, so a 409
 * `REQUEST_ALREADY_CLAIMED` is surfaced as an informational message and the list
 * refreshes, not as an error state.
 *
 * Entries carry no patient identity by design — the backend withholds it until
 * acceptance, since a doctor who has not accepted is not yet the treating
 * clinician. What is shown is enough to decide: service, channel, time, fee, and
 * a bounded chief-complaint excerpt.
 */
export function RequestPool() {
  const idToken = useIdToken();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const poolQuery = useQuery({
    queryKey: ["doctor-request-pool", idToken],
    queryFn: () => fetchRequestPool(idToken ?? ""),
    enabled: !!idToken,
    refetchInterval: (query) =>
      query.state.data?.kind === "unavailable" ? false : LIVE_QUEUE_POLL_INTERVAL_MS,
    retry: false,
  });

  const accept = useMutation({
    mutationFn: (bookingId: string) => acceptRequest(idToken ?? "", bookingId),
    onSuccess: (outcome) => {
      setNotice(
        outcome.kind === "claimed"
          ? "Another doctor accepted that request first."
          : null,
      );
      void queryClient.invalidateQueries({ queryKey: ["doctor-request-pool"] });
      // Shared constant, not a string literal: `usePatientBoard` reads its board
      // through this exact key, and a typo or drift here silently breaks the
      // handoff again — an accepted request would leave the pool and never appear
      // on the board (ADR-20260809-08).
      void queryClient.invalidateQueries({ queryKey: [DOCTOR_INTAKE_QUEUE_QUERY_KEY] });
    },
  });

  // Flag off for this environment: render nothing rather than an empty card.
  // Distinct from every other state below, which all render the card shell —
  // this is the one case where the feature itself is absent, not merely quiet.
  if (poolQuery.data?.kind === "unavailable") return null;

  const requests = poolQuery.data?.kind === "ok" ? poolQuery.data.requests : [];
  const visibleRequests = expanded ? requests : requests.slice(0, VISIBLE_REQUEST_CAP);
  const hiddenCount = requests.length - visibleRequests.length;

  return (
    <div className={QUEUE_SECTION_CLASS} data-slot="request-pool">
      <h3 className={queueSectionHeaderClass("text-(--status-soon-fg)")}>
        <Zap className="size-4" />
        On-Demand
        <span className="ml-auto flex h-4 items-center overflow-hidden font-mono text-xs text-(--text-subtle)">
          <NumberTicker value={requests.length} />
        </span>
      </h3>

      <div className="flex flex-col gap-3">
        {notice ? (
          <Alert data-slot="request-pool-notice">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}

        {poolQuery.isLoading ? (
          <div
            data-slot="request-pool-loading"
            className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Spinner className="size-4" />
            Loading consultation requests…
          </div>
        ) : poolQuery.error ? (
          <div data-slot="request-pool-error" className="flex flex-col items-center gap-3 p-6">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Couldn&apos;t load consultation requests</AlertTitle>
              <AlertDescription>
                {poolQuery.error instanceof Error
                  ? poolQuery.error.message
                  : "Something went wrong"}
              </AlertDescription>
            </Alert>
            <Button variant="outline" size="sm" onClick={() => void poolQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <Empty data-slot="request-pool-empty" className="gap-2 p-2">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>No open requests</EmptyTitle>
              <EmptyDescription>
                New consultation requests appear here as soon as a patient pays.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {visibleRequests.map((request) => (
                <RequestCard
                  key={request.bookingId}
                  request={request}
                  onAccept={() => accept.mutate(request.bookingId)}
                  isAccepting={accept.isPending && accept.variables === request.bookingId}
                  disabled={accept.isPending}
                />
              ))}
            </ul>
            {hiddenCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-center text-xs"
                onClick={() => setExpanded(true)}
              >
                {hiddenCount} more request{hiddenCount === 1 ? "" : "s"}
              </Button>
            ) : expanded && requests.length > VISIBLE_REQUEST_CAP ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-center text-xs"
                onClick={() => setExpanded(false)}
              >
                Show less
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function RequestCard({
  request,
  onAccept,
  isAccepting,
  disabled,
}: {
  request: OnDemandRequest;
  onAccept: () => void;
  isAccepting: boolean;
  disabled: boolean;
}) {
  const amount = formatAmount(request.amountCents, request.currency);
  const requested = new Date(request.requestedAt);
  const requestedLabel = Number.isNaN(requested.getTime())
    ? null
    : requested.toLocaleString();

  return (
    <li className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{serviceLabel(request.serviceType)}</span>
            <Badge variant="outline" className="capitalize">
              {request.channel}
            </Badge>
            {amount ? (
              <span className="text-sm text-muted-foreground">{amount}</span>
            ) : null}
          </div>

          {/*
            Who the doctor would be treating, shown before they accept
            (ADR-20260808-02). The pool previously withheld every identifying field
            until acceptance; a clinician choosing whether to take a case has a
            defensible reason to know whose case it is.

            Falls back to the booking reference — labelled as one — when the patient
            has not saved a name. Never their email: that is more identifying than a
            name, not less.
          */}
          <p className="text-sm font-semibold text-foreground">
            {request.patientName ?? `Ref ${request.bookingId.slice(-6).toUpperCase()}`}
          </p>

          {requestedLabel ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0" />
              Requested {requestedLabel}
            </span>
          ) : null}

          <p className="flex items-start gap-1.5 text-sm">
            <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            {request.reasonExcerpt ?? (
              <span className="text-muted-foreground">
                {request.intakeSubmitted
                  ? "No reason recorded"
                  : "Patient has not submitted intake yet"}
              </span>
            )}
          </p>
        </div>

        <Button size="sm" onClick={onAccept} disabled={disabled}>
          {isAccepting ? (
            <>
              <Spinner className="mr-2 size-3" />
              Accepting…
            </>
          ) : (
            "Accept"
          )}
        </Button>
      </div>
    </li>
  );
}
