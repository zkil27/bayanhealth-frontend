"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { newIdempotencyKey } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/useAuthStore";
import { patientBoardInfo } from "../types/bookingBoard.types";
import { LIVE_QUEUE_POLL_INTERVAL_MS } from "../lib/pollIntervals";

export type BoardState = {
  requests: patientBoardInfo[];
  pending: patientBoardInfo[];
  ready: patientBoardInfo[];
};

/**
 * Shared with {@link ../components/RequestPool.tsx}. Accepting a pooled on-demand
 * request calls `POST /v1/doctors/me/request-pool/{bookingId}/accept`, not the
 * intake-queue confirm endpoint below, so this hook has no way to know that
 * happened on its own — it has to be told, and a shared React Query key is how.
 *
 * Before this hook used React Query at all, it kept its board in local `useState`
 * populated by a one-shot fetch on mount, with no subscription to anything.
 * `RequestPool`'s accept flow called
 * `queryClient.invalidateQueries({ queryKey: ["doctor-intake-queue"] })`, which
 * did nothing here, because nothing here was a React Query cache entry with that
 * key — invalidating a key nobody is subscribed to is a no-op. A doctor who
 * accepted a request from the pool saw it vanish (it left the pool immediately)
 * and never saw it land on the board, because the board never re-fetched
 * (ADR-20260809-08).
 */
export const DOCTOR_INTAKE_QUEUE_QUERY_KEY = "doctor-intake-queue";

/** Matches the backend IntakeQueueEntry schema (openapi.yaml). */
interface ApiBookingEntry {
  booking: {
    bookingId: string;
    patientId: string;
    doctorId?: string;
    serviceType: string;
    bookingMode: string;
    scheduledAt: string;
    status: string;
    /** Queue status lives on the Booking object per the OpenAPI Booking schema. */
    intakeQueueStatus?: "pending" | "ready" | "in_progress" | "need_review";
    channel?: string;
    /** Consultation fee, per the Booking schema. Absent on some legacy bookings. */
    amountCents?: number;
    currency?: string;
    /**
     * When a doctor accepted this booking (`Booking.acceptedAt`). Anchors the
     * ten-minute mandatory wait before a no-show may be asserted
     * (ADR-20260808-03, ADR-20260909-01). Absent on a booking the auto-matcher
     * assigned directly rather than a doctor accepting it from the pool.
     */
    acceptedAt?: string;
  };
  /** Top-level intake form completion status on the IntakeQueueEntry wrapper. */
  intakeFormStatus?: "draft" | "submitted" | "acknowledged";
  /** Bounded chief-complaint excerpt on the same wrapper. */
  reasonExcerpt?: string;
  /** The patient's saved display name, absent when they have not provided one. */
  patientName?: string;
}

function hashId(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Project a queue entry onto the board card.
 *
 * The name slot carries the patient's own saved name when there is one, and the
 * **booking reference** when there is not. Patients can now supply a name
 * (`PUT /v1/patients/me/profile`), and the assigned doctor may see it — but a
 * patient who has not is still shown as `Ref XXXXXX`, because that is what the
 * platform actually knows. The label matters: a derived string sitting unlabelled
 * in a name position reads as an identity, which is how this slot used to render
 * `Patient A1B2C3`.
 */
function toPatientBoardInfo(entry: ApiBookingEntry): patientBoardInfo {
  const { booking } = entry;
  // Derived from the BOOKING id, not the patient id.
  //
  // This was `booking.patientId.slice(-6)`, so every booking belonging to the same
  // patient rendered the identical reference — five distinct bookings appeared on
  // the board as the same card repeated five times. `RequestPool` already derived
  // it this way; the board disagreed.
  const shortRef = booking.bookingId.slice(-6).toUpperCase();
  return {
    id: hashId(booking.bookingId),
    bookingId: booking.bookingId,
    // The patient's own name when they have saved one, and the booking reference
    // when they have not. The reference is not a fallback name — it is what the
    // platform actually knows, which is why it stays labelled `Ref`.
    name: entry.patientName ?? `Ref ${shortRef}`,
    initials: shortRef.slice(0, 2),
    avatar: "",
    isVerified: booking.status === "confirmed" || booking.status === "in_progress",
    serviceRequested: booking.serviceType,
    timestamp: new Date(booking.scheduledAt).getTime(),
    commsAppPreferred: [],
    // The intake queue entry carries no attachment count and there is no
    // endpoint to count them from at board-render time, so this stays 0 and the
    // card suppresses the attachment badge entirely rather than inventing a
    // number (see DoctorDashboardBoard).
    filesAttached: 0,
    type: booking.bookingMode === "on_demand" ? "On Demand" : "Scheduled",
    // Carried through so the board can show why the patient booked without a
    // request per card. The backend already read the intake form to derive
    // `intakeFormStatus`; the excerpt comes from that same read.
    ...(entry.reasonExcerpt ? { reasonExcerpt: entry.reasonExcerpt } : {}),
    ...(entry.intakeFormStatus ? { intakeFormStatus: entry.intakeFormStatus } : {}),
    // Channel and fee are real Booking fields (Figma O9 card shows both), not
    // invented display data — carried through when the backend has them.
    ...(booking.channel ? { channel: booking.channel } : {}),
    ...(booking.amountCents ? { amountCents: booking.amountCents } : {}),
    ...(booking.currency ? { currency: booking.currency } : {}),
    // Carried through so "Ready to start" can offer a no-show control gated
    // on the real ten-minute wait, rather than guessing from `bookingMode`
    // alone whether an acceptance ever happened.
    ...(booking.bookingMode ? { bookingMode: booking.bookingMode } : {}),
    ...(booking.acceptedAt ? { acceptedAt: booking.acceptedAt } : {}),
  };
}

function groupByQueueStatus(entries: ApiBookingEntry[]): BoardState {
  const board: BoardState = { requests: [], pending: [], ready: [] };
  for (const entry of entries) {
    // intakeQueueStatus lives on entry.booking per the Booking schema
    const status = entry.booking.intakeQueueStatus;
    const item = toPatientBoardInfo(entry);
    if (status === "pending" || status == null) {
      board.requests.push(item);
    } else if (status === "in_progress") {
      board.pending.push(item);
    } else {
      // "ready" and "need_review" both go to the ready column
      board.ready.push(item);
    }
  }
  return board;
}

const EMPTY_BOARD: BoardState = { requests: [], pending: [], ready: [] };

export function usePatientBoard() {
  const session = useAuthStore((s) => s.session);
  const idToken = session?.idToken ?? null;
  const queryClient = useQueryClient();

  const boardQuery = useQuery({
    queryKey: [DOCTOR_INTAKE_QUEUE_QUERY_KEY, idToken],
    queryFn: async () => {
      const res = await api.get<ApiBookingEntry[]>(
        "/v1/doctors/me/intake-queue",
        idToken ?? "",
      );
      return groupByQueueStatus(res.data);
    },
    enabled: !!idToken,
    // Short poll rather than none. `RequestPool`'s invalidation covers the accept
    // case, but a second doctor's board — or a booking that entered the queue by
    // auto-match rather than pool acceptance — has no action of this doctor's own
    // to invalidate on. Shared with `RequestPool`'s own poll (see
    // `lib/pollIntervals.ts`) — both are "live decision queue" reads.
    refetchInterval: LIVE_QUEUE_POLL_INTERVAL_MS,
    retry: false,
  });

  const accept = useMutation({
    mutationFn: async (patient: patientBoardInfo) => {
      if (!idToken) throw new Error("AUTH_REQUIRED");
      await api.post(
        `/v1/doctors/me/intake-queue/${encodeURIComponent(patient.bookingId)}/process`,
        idToken,
        { action: "confirm" },
        newIdempotencyKey(),
      );
    },
    // Optimistic move from `requests` to `pending`, matching the pre-React-Query
    // behaviour: reverted automatically on error by restoring the snapshot.
    onMutate: async (patient) => {
      await queryClient.cancelQueries({ queryKey: [DOCTOR_INTAKE_QUEUE_QUERY_KEY, idToken] });
      const previous = queryClient.getQueryData<BoardState>([
        DOCTOR_INTAKE_QUEUE_QUERY_KEY,
        idToken,
      ]);
      queryClient.setQueryData<BoardState>(
        [DOCTOR_INTAKE_QUEUE_QUERY_KEY, idToken],
        (current) => {
          const board = current ?? EMPTY_BOARD;
          return {
            ...board,
            requests: board.requests.filter((r) => r.id !== patient.id),
            pending: [{ ...patient, timestamp: Date.now() }, ...board.pending],
          };
        },
      );
      return { previous };
    },
    onError: (_err, _patient, context) => {
      if (context?.previous) {
        queryClient.setQueryData([DOCTOR_INTAKE_QUEUE_QUERY_KEY, idToken], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [DOCTOR_INTAKE_QUEUE_QUERY_KEY] });
    },
  });

  const board = boardQuery.data ?? EMPTY_BOARD;
  const total = board.requests.length + board.pending.length + board.ready.length;

  const error = useMemo(() => {
    if (accept.error) {
      return accept.error instanceof ApiError
        ? accept.error.message
        : "Failed to accept booking.";
    }
    if (boardQuery.error) {
      return boardQuery.error instanceof ApiError
        ? boardQuery.error.message
        : "Failed to load intake queue.";
    }
    return null;
  }, [accept.error, boardQuery.error]);

  return {
    board,
    isConnecting: boardQuery.isLoading,
    error,
    isEmpty: !boardQuery.isLoading && total === 0,
    acceptPatient: (patient: patientBoardInfo) => accept.mutateAsync(patient),
    reload: () => void boardQuery.refetch(),
  };
}
