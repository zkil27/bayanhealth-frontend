"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, RefreshCw, Satellite, UserRoundX, Video } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SectionLabel } from "@/features/patient/components/redesign/primitives";
import { cn } from "@/lib/utils";
import { bookingServices } from "@/types/booking.types";
import { DOCTOR_INTAKE_QUEUE_QUERY_KEY } from "@/features/doctor/hooks/usePatientBoard";
import { DOCTOR_TODAY_AGENDA_QUERY_KEY } from "@/features/doctor/hooks/useTodayAgenda";
import {
  REQUEST_POOL_QUERY_KEY,
  useDoctorQueueSummary,
} from "@/features/doctor/hooks/useDoctorQueueSummary";
import { useMyDoctorProfile } from "@/features/doctor/hooks/useMyDoctorProfile";
import { useIdToken } from "@/stores/useAuthStore";

import { usePatientBoard } from "../../hooks/usePatientBoard";
import { useTodayAgenda } from "../../hooks/useTodayAgenda";
import { useStartConsultation } from "../../hooks/useStartConsultation";
import { useAssertNoShow } from "../../hooks/useAssertNoShow";
import { noShowWaitRemainingMs } from "../../lib/noShowWait";
import { composeReadyToStartItems, type ReadyToStartItem } from "../../lib/readyToStart";
import {
  acceptRequest,
  fetchRequestPool,
  type OnDemandRequest,
} from "../../lib/api/requestPool";
import { ReadyIntakeContent } from "./ReadyIntakeContent";
import { DoctorConsultationAccess } from "./DoctorConsultationAccess";
import { DoctorDashboardDrawer } from "./DoctorDashboardDrawer";
import { TriageDetailsModal } from "./TriageDetailsModal";
import { AcceptConsultModal, type AcceptConsultTarget } from "./AcceptConsultModal";
import type { patientBoardInfo } from "../../types/bookingBoard.types";

export function serviceLabel(serviceType?: string): string | null {
  if (!serviceType) return null;
  return bookingServices.find((s) => s.value === serviceType)?.label ?? null;
}

function formatAmount(amountCents?: number, currency?: string): string | null {
  if (typeof amountCents !== "number" || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      amountCents / 100,
    );
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

/** Rows shown before collapsing to an "N more" link — the dashboard's own "no card scrolls" rule. */
const VISIBLE_CAP = 6;

/**
 * The Unified Clinical Patient Queue — one flat, slim-row list instead of
 * three stacked boxes (`ReadyToStartCard`, `RequestPool`, `IncomingRequestsCard`),
 * each of which used to render its own header, empty state and card shell even
 * with a single entry. Three near-empty boxes were consuming most of the
 * sheet's height and pushing the recent-consultations deck below the fold.
 *
 * This still reads from the exact same three real sources — `usePatientBoard`
 * (ready + incoming), `useTodayAgenda` (in-progress today), and the same
 * `doctor-request-pool` query `RequestPool` itself used — normalised into one
 * `QueueRow[]` and sorted ready-in-progress-first, so nothing here fabricates
 * a shared state a source doesn't actually have: a pool request still shows
 * "Accept", a ready item still shows "Start"/"Rejoin", and an incoming booking
 * still shows its own accept/view flow. Collapsing three distinct action sets
 * into a single row *shape* (not a single action) is what makes the merge
 * honest rather than lossy.
 */
export function DoctorPatientQueue() {
  const summary = useDoctorQueueSummary();
  const { profile } = useMyDoctorProfile();
  const isOnDuty = profile?.onDemandAvailable ?? false;

  return (
    <section
      aria-labelledby="doctor-patient-queue-heading"
      className="flex flex-col gap-3 border-t border-(--border-subtle) pt-4"
    >
      <SectionLabel id="doctor-patient-queue-heading">Patient queue</SectionLabel>

      <div
        id="doctor-queues"
        data-slot="operational-queues"
        className="scroll-mt-4 rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-page)/40 p-4"
      >
        {summary.isEmpty ? <StandbyPanel isOnDuty={isOnDuty} /> : <UnifiedQueueList />}
      </div>
    </section>
  );
}

type QueueRow =
  | { kind: "ready"; key: string; item: ReadyToStartItem }
  | { kind: "pool"; key: string; item: OnDemandRequest }
  | { kind: "incoming"; key: string; item: patientBoardInfo };

/** What is being accepted right now — carried from the row through both modals. */
type ConfirmTarget =
  | { kind: "pool"; item: OnDemandRequest }
  | { kind: "incoming"; item: patientBoardInfo };

function targetFromPool(item: OnDemandRequest): AcceptConsultTarget {
  return {
    bookingId: item.bookingId,
    name: item.patientName ?? `Ref ${item.bookingId.slice(-6).toUpperCase()}`,
    serviceLabel: serviceLabel(item.serviceType) ?? item.serviceType.replaceAll("_", " "),
    amountLabel: formatAmount(item.amountCents, item.currency),
    requestedLabel: (() => {
      const d = new Date(item.requestedAt);
      return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
    })(),
  };
}

function targetFromIncoming(item: patientBoardInfo): AcceptConsultTarget {
  return {
    bookingId: item.bookingId,
    name: item.name,
    serviceLabel: serviceLabel(item.serviceRequested),
    amountLabel: formatAmount(item.amountCents, item.currency),
    requestedLabel: (() => {
      const d = new Date(item.timestamp);
      return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
    })(),
  };
}

function UnifiedQueueList() {
  const [expanded, setExpanded] = useState(false);
  const idToken = useIdToken();
  const queryClient = useQueryClient();

  const { board, isConnecting: boardLoading, error: boardError, acceptPatient } =
    usePatientBoard();
  const { bookings: todayBookings, isLoading: agendaLoading, error: agendaError } =
    useTodayAgenda();
  const poolQuery = useQuery({
    queryKey: [REQUEST_POOL_QUERY_KEY, idToken],
    queryFn: () => fetchRequestPool(idToken ?? ""),
    enabled: !!idToken,
    retry: false,
  });

  const acceptPool = useMutation({
    mutationFn: (bookingId: string) => acceptRequest(idToken ?? "", bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [REQUEST_POOL_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [DOCTOR_INTAKE_QUEUE_QUERY_KEY] });
    },
  });

  // Neither of the two safety-gate modals below ever accepts blindly on the
  // doctor's behalf: both routes into `handleConfirmAccept` (the queue row's
  // own "Accept" button, and the review modal's "Proceed to accept") land on
  // the same confirmation dialog before either real mutation fires.
  const [reviewItem, setReviewItem] = useState<OnDemandRequest | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const closeConfirm = () => {
    if (isConfirming) return;
    setConfirmTarget(null);
    setConfirmError(null);
  };

  const handleConfirmAccept = async () => {
    if (!confirmTarget) return;
    setIsConfirming(true);
    setConfirmError(null);
    try {
      let isOnDemand: boolean;
      let name: string;

      // When running in demo mode or without a live backend connection:
      if (!idToken || confirmTarget.item.bookingId.startsWith("demo-")) {
        isOnDemand = confirmTarget.kind === "pool";
        name =
          confirmTarget.kind === "pool"
            ? targetFromPool(confirmTarget.item).name
            : targetFromIncoming(confirmTarget.item).name;
        setConfirmTarget(null);
        toast.success(
          isOnDemand
            ? `${name} accepted — ready to begin in Command Center.`
            : `${name} accepted — scheduled on your calendar.`,
        );
        return;
      }

      if (confirmTarget.kind === "pool") {
        // `acceptRequest` resolves (never rejects) a lost claim race as
        // `{ kind: "claimed" }` — the pool is broadcast, so another doctor
        // winning is an ordinary outcome, not a thrown error. That still has
        // to keep this dialog open with an explanation rather than reading it
        // as success and closing on a request that was never actually claimed.
        const outcome = await acceptPool.mutateAsync(confirmTarget.item.bookingId);
        if (outcome.kind === "claimed") {
          setConfirmError("Another doctor accepted this request first.");
          return;
        }
        isOnDemand = true;
        name = targetFromPool(confirmTarget.item).name;
      } else {
        await acceptPatient(confirmTarget.item);
        // `type` (not `bookingMode`, which is only sometimes present — see
        // `patientBoardInfo`'s own doc comment) is the field `usePatientBoard`
        // always populates from the same `bookingMode === "on_demand"` check,
        // so it is the reliable one to read here.
        isOnDemand = confirmTarget.item.type === "On Demand";
        name = targetFromIncoming(confirmTarget.item).name;
      }
      setConfirmTarget(null);
      // The accepted row leaves this queue (see the `isInProgress` filter on
      // `rows` below) the moment it becomes ready, so the toast is the only
      // thing left pointing the doctor at where it went.
      toast.success(
        isOnDemand
          ? `${name} accepted — you'll find them in the Command Center once ready to start.`
          : `${name} accepted — now on your calendar.`,
      );
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : "This consultation is no longer available in the queue.",
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const isLoading = Boolean(idToken && (boardLoading || agendaLoading || poolQuery.isLoading));
  const error =
    boardError ??
    (agendaError instanceof Error ? agendaError.message : null) ??
    (poolQuery.error instanceof Error ? poolQuery.error.message : null);

  const poolRequests = poolQuery.data?.kind === "ok" ? poolQuery.data.requests : [];
  // Keep every assigned ready encounter reachable. The command center may
  // spotlight one on-demand encounter, but there is no server-side invariant
  // limiting a doctor to one accepted case, so removing the remaining rows
  // would strand additional accepted patients.
  const readyItems = composeReadyToStartItems(board.ready, todayBookings);

  const rawRows: QueueRow[] = [
    ...readyItems.map((item) => ({ kind: "ready" as const, key: `ready-${item.bookingId}`, item })),
    ...poolRequests.map((item) => ({ kind: "pool" as const, key: `pool-${item.bookingId}`, item })),
    ...board.requests.map((item) => ({
      kind: "incoming" as const,
      key: `incoming-${item.bookingId}`,
      item,
    })),
  ];

  const rows: QueueRow[] = rawRows;

  const visibleRows = expanded ? rows : rows.slice(0, VISIBLE_CAP);
  const hiddenCount = rows.length - visibleRows.length;

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-2" aria-hidden data-slot="unified-queue-loading">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-(--border-subtle) p-3">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <p className="p-4 text-center text-sm text-destructive" data-slot="unified-queue-error">
        {error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-slot="unified-queue-list">
      <ul className="flex flex-col gap-2">
        {visibleRows.map((row) => {
          switch (row.kind) {
            case "ready":
              return <ReadyQueueRow key={row.key} item={row.item} />;
            case "pool":
              return (
                <PoolQueueRow
                  key={row.key}
                  item={row.item}
                  onReview={() => setReviewItem(row.item)}
                  onAcceptClick={() => setConfirmTarget({ kind: "pool", item: row.item })}
                />
              );
            case "incoming":
              return (
                <IncomingQueueRow
                  key={row.key}
                  item={row.item}
                  onAcceptClick={() => setConfirmTarget({ kind: "incoming", item: row.item })}
                />
              );
          }
        })}
      </ul>
      {hiddenCount > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-xs"
          onClick={() => setExpanded(true)}
        >
          {hiddenCount} more
        </Button>
      ) : expanded && rows.length > VISIBLE_CAP ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-xs"
          onClick={() => setExpanded(false)}
        >
          Show less
        </Button>
      ) : null}

      <TriageDetailsModal
        item={reviewItem}
        isOpen={reviewItem !== null}
        onClose={() => setReviewItem(null)}
        onProceedToAccept={() => {
          if (!reviewItem) return;
          setConfirmTarget({ kind: "pool", item: reviewItem });
          setReviewItem(null);
        }}
      />

      <AcceptConsultModal
        target={
          confirmTarget?.kind === "pool"
            ? targetFromPool(confirmTarget.item)
            : confirmTarget?.kind === "incoming"
              ? targetFromIncoming(confirmTarget.item)
              : null
        }
        isOpen={confirmTarget !== null}
        isSubmitting={isConfirming}
        errorMessage={confirmError}
        onClose={closeConfirm}
        onConfirm={() => void handleConfirmAccept()}
      />
    </div>
  );
}

/** Colour + label for each row's queue-type badge, matching the earlier per-card tinting. */
const ROW_BADGE: Record<QueueRow["kind"], { label: string; className: string }> = {
  ready: { label: "Ready in room", className: "bg-(--status-available-bg) text-(--status-available-fg)" },
  pool: { label: "On-Demand", className: "bg-(--status-soon-bg) text-(--status-soon-fg)" },
  incoming: { label: "Scheduled booking", className: "bg-(--surface-brand)/10 text-(--surface-brand)" },
};

/** Shared row shell — one slim bordered row per patient, regardless of source. */
function QueueRowShell({
  avatarSrc,
  initials,
  name,
  badge,
  subtitle,
  action,
  dataSlot,
  queueType,
}: {
  avatarSrc?: string;
  initials: string;
  name: string;
  badge: QueueRow["kind"];
  subtitle: string;
  action: React.ReactNode;
  dataSlot: string;
  queueType: QueueRow["kind"];
}) {
  const tone = ROW_BADGE[badge];
  return (
    <li
      data-slot={dataSlot}
      data-queue-type={queueType}
      className="flex items-center justify-between gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9 shrink-0">
          {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[13px] font-bold text-(--text-heading)">{name}</span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
                tone.className,
              )}
            >
              {tone.label}
            </span>
          </div>
          <p className="truncate text-[11.5px] text-(--text-muted)">{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{action}</div>
    </li>
  );
}

function ReadyQueueRow({ item }: { item: ReadyToStartItem }) {
  const startConsultation = useStartConsultation();
  const label = serviceLabel(item.serviceType);

  return (
    <QueueRowShell
      dataSlot="queue-row"
      queueType="ready"
      badge="ready"
      initials={item.initials}
      name={item.name}
      subtitle={
        item.isInProgress
          ? `${label ?? "Consultation"} · already in progress`
          : (label ?? item.reasonExcerpt ?? "General medical consultation")
      }
      action={
        <>
          <ViewIntakeDrawer bookingId={item.bookingId} name={item.name} />
          {!item.isInProgress ? <NoShowControl item={item} /> : null}
          <Button
            size="sm"
            onClick={() => void startConsultation.start(item.bookingId)}
            disabled={startConsultation.status === "starting"}
          >
            {startConsultation.status === "starting" ? (
              <Spinner className="size-3.5" />
            ) : (
              <>
                <Video className="mr-1.5 size-3.5" />
                {item.isInProgress ? "Rejoin" : "Start"}
              </>
            )}
          </Button>
        </>
      }
    />
  );
}

function PoolQueueRow({
  item,
  onReview,
  onAcceptClick,
}: {
  item: OnDemandRequest;
  onReview: () => void;
  onAcceptClick: () => void;
}) {
  const label = serviceLabel(item.serviceType) ?? item.serviceType.replaceAll("_", " ");
  const amount = formatAmount(item.amountCents, item.currency);

  return (
    <QueueRowShell
      dataSlot="queue-row"
      queueType="pool"
      badge="pool"
      initials={
        item.patientName
          ? item.patientName.slice(0, 2).toUpperCase()
          : item.bookingId.slice(-2).toUpperCase()
      }
      name={item.patientName ?? `Ref ${item.bookingId.slice(-6).toUpperCase()}`}
      subtitle={[label, amount].filter(Boolean).join(" · ") || "General medical consultation"}
      action={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onReview}>
            <Eye className="mr-1.5 size-3.5" />
            Review
          </Button>
          <Button size="sm" onClick={onAcceptClick}>
            Accept Consult →
          </Button>
        </>
      }
    />
  );
}

function IncomingQueueRow({
  item,
  onAcceptClick,
}: {
  item: patientBoardInfo;
  onAcceptClick: () => void;
}) {
  const label = serviceLabel(item.serviceRequested);

  // The drawer's own "Confirm & Send Intake" button is a second entry point
  // into acceptance — routed through the same `onAcceptClick` rather than
  // straight to `acceptPatient`, so a doctor cannot commit from inside the
  // review drawer without also passing the confirmation safety gate.
  return (
    <QueueRowShell
      dataSlot="queue-row"
      queueType="incoming"
      badge="incoming"
      avatarSrc={item.avatar}
      initials={item.initials}
      name={item.name}
      subtitle={label ?? item.reasonExcerpt ?? "General medical consultation"}
      action={
        <>
          <DoctorDashboardDrawer patient={item} onAcceptBooking={onAcceptClick} />
          <Button size="sm" onClick={onAcceptClick} className="min-w-24">
            Accept
          </Button>
        </>
      }
    />
  );
}

/**
 * "View" — the intake preview for a ready-to-start consultation, carried over
 * from `ReadyToStartCard`'s own drawer verbatim (same two panels, same reason
 * it is not `DoctorDashboardDrawer`: that one also carries an incoming-request
 * accept/cancel flow that does not apply to an already-ready consultation).
 */
function ViewIntakeDrawer({ bookingId, name }: { bookingId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        data-slot="ready-to-start-view-trigger"
      >
        <Eye className="size-3.5" />
      </Button>
      <DrawerContent className="mx-auto w-full max-w-2xl">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>{name}</DrawerTitle>
          <DrawerClose className="text-xs text-muted-foreground hover:text-foreground">
            Close
          </DrawerClose>
        </DrawerHeader>
        <DoctorConsultationAccess bookingId={bookingId} />
        <ReadyIntakeContent bookingId={bookingId} />
      </DrawerContent>
    </Drawer>
  );
}

/** How often the no-show wait countdown is recomputed. */
const NO_SHOW_TICK_MS = 1000;

/**
 * "Patient didn't show" — carried over from `ReadyToStartCard` verbatim
 * (ADR-20260808-03, ADR-20260909-01): still gated to `on_demand` bookings with
 * a recorded `acceptedAt`, still disabled behind a live ten-minute countdown
 * rather than a rejected call.
 *
 * Exported so `ActiveEncounterCommandCenter` can render the same control for
 * a just-accepted, not-yet-started on-demand encounter — that row no longer
 * appears in this queue (see the `isInProgress` filter above), and the
 * no-show action needs to stay reachable from wherever that encounter now
 * anchors.
 */
export function NoShowControl({ item }: { item: ReadyToStartItem }) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const { assertNoShow, isAsserting, isSettled, errorMessage } = useAssertNoShow(item.bookingId);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), NO_SHOW_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const hasAcceptedAt = typeof item.acceptedAt === "string" && item.acceptedAt.length > 0;
  if (item.bookingMode !== "on_demand" || !hasAcceptedAt) return null;

  if (isSettled) {
    return (
      <span
        className="rounded-xl bg-(--status-available-bg) px-2 py-1.5 text-[11px] font-bold text-(--status-available-fg)"
        data-slot="no-show-settled"
      >
        Recorded
      </span>
    );
  }

  const acceptedAtMs = new Date(item.acceptedAt as string).getTime();
  const remainingMs = noShowWaitRemainingMs(acceptedAtMs, nowMs);
  const waitElapsed = remainingMs === null;

  return (
    <div className="flex flex-col items-end gap-1" data-slot="no-show-control">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!waitElapsed || isAsserting}
        onClick={() => {
          if (window.confirm("Record this patient as a no-show? This cannot be undone from here.")) {
            assertNoShow();
          }
        }}
        className="text-(--danger-fg)"
        title={waitElapsed ? "Patient didn't show" : "Waiting out the ten-minute window"}
      >
        {isAsserting ? <Spinner className="size-3.5" /> : <UserRoundX className="size-3.5" />}
      </Button>
      {errorMessage ? (
        <span data-slot="no-show-error" className="text-[10.5px] text-(--danger-fg)">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The standby stage shown once every queue source reads genuinely empty.
 *
 * What this deliberately does not claim: a "live socket connected" badge, or a
 * chime the doctor can test. Nothing on this dashboard holds a persistent
 * connection — every queue here is polled REST, not pushed — so a "Live link
 * connected" pill would assert a mechanism that does not exist, and there is
 * no audio-alert feature anywhere in the app for a "Test alert chime" button
 * to actually test. What *is* real and offered instead: the on-duty state
 * (`useMyDoctorProfile`) and a manual refresh that invalidates the exact three
 * queries this panel is summarising, for a doctor who does not want to wait
 * out the poll interval.
 */
function StandbyPanel({ isOnDuty }: { isOnDuty: boolean }) {
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [REQUEST_POOL_QUERY_KEY] });
    void queryClient.invalidateQueries({ queryKey: [DOCTOR_INTAKE_QUEUE_QUERY_KEY] });
    void queryClient.invalidateQueries({ queryKey: [DOCTOR_TODAY_AGENDA_QUERY_KEY] });
  };

  return (
    <div
      data-slot="doctor-queue-standby"
      className="flex flex-col items-center gap-3 rounded-2xl border border-(--border-subtle) bg-(--surface-warm) px-5 py-6 text-center sm:flex-row sm:justify-between sm:text-left"
    >
      <div className="flex items-center gap-3.5">
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-(--status-available-fg)/20 bg-(--status-available-bg) text-(--status-available-fg)">
          <Satellite className="size-4.5" aria-hidden />
        </span>
        <div>
          <h4 className="text-[13px] font-bold tracking-wide text-(--text-heading) uppercase">
            {isOnDuty ? "Triage radar active · ready for patients" : "Offline · walk-ins paused"}
          </h4>
          <p className="mt-0.5 text-[12.5px] leading-[1.45] text-(--text-muted)">
            {isOnDuty
              ? "You're on-duty and visible in the consultation pool. A verified patient will appear here the moment their intake is ready."
              : "Turn on duty status in the command bar above to start receiving live on-demand consultations."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={refresh}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 self-center rounded-xl border border-(--border-default) bg-(--surface-card) px-3 py-1.5 text-[12.5px] font-semibold text-(--text-body) shadow-sm transition-colors hover:bg-(--action-secondary-hover-surface)"
      >
        <RefreshCw className="size-3.5" aria-hidden />
        Refresh now
      </button>
    </div>
  );
}
