"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { toast } from "sonner";

import { AsyncView } from "@/components/async-view";
import { useAsyncResource } from "@/hooks/use-async-resource";
import type { AsyncState } from "@/lib/asyncView";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuthStore } from "@/stores/useAuthStore";

import { createSlots, listSlotsInRange, type Slot } from "../../lib/api/schedule";
import { listAgendaInRange, type DoctorBooking } from "../../lib/api/agenda";
import { getDemoCalendarData } from "../../lib/demoData";
import { ActiveDaySlotList } from "./ActiveDaySlotList";
import { AppointmentPopover } from "./AppointmentPopover";
import { CalendarLegend, useCalendarPalette } from "./CalendarLegend";
import {
  PLATFORM_UTC_OFFSET_MINUTES,
  buildEntriesByDate,
  isAppointment,
  type CalendarEntry,
} from "./calendarEntries";
import {
  AvailabilityPopover,
  type GenerationReport,
  type ShiftDraft,
} from "./AvailabilityPopover";
import { CalendarToolbar } from "./CalendarToolbar";
import { MonthGrid } from "./MonthGrid";
import { MonthOverflowPopover } from "./MonthOverflowPopover";
import { rectFromMouseEvent, type AnchorRect } from "./SchedulePopover";
import { ShiftInspectorPopover } from "./ShiftInspectorPopover";
import { TimeGrid, type GridSelection } from "./TimeGrid";
import {
  CALENDAR_VIEWS,
  DEFAULT_SHIFT_MINUTES,
  VIEW_SHORTCUTS,
  defaultRangeFrom,
  dragRangeToTimes,
  isoDate,
  rangeLabel as formatRangeLabel,
  stepAnchor,
  visibleDays,
  visibleRange,
  type CalendarView,
} from "./calendarView";
import type { SlotPlan } from "./slotPlan";

/** Today's date as a YYYY-MM-DD string. */
function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Present a YYYY-MM-DD date as a readable heading, falling back gracefully. */
function formatDateHeading(date: string): string {
  const parsed = parseISO(date);
  return isValid(parsed) ? format(parsed, "EEEE, MMM d, yyyy") : date;
}

/** "Mon" for a week column, the full weekday when a single day fills the grid. */
function dayColumnLabel(date: Date, view: CalendarView): string {
  return view === "day" ? format(date, "EEEE") : format(date, "EEE");
}

/** Where a shift proposed from the day drawer's empty state starts, when no time was pointed at. */
const TOOLBAR_DEFAULT_START_MINUTES = 9 * 60;

/** Both halves of the calendar's read, kept together so they refresh as one. */
interface CalendarData {
  slots: Slot[];
  bookings: DoctorBooking[];
}

/*
  The agenda read takes instants; the grid thinks in platform-local dates.

  A day that begins at 00:00 in Manila begins at 16:00 UTC the day before, so
  converting with the browser's own timezone would clip the first or last hours
  of the visible range for anyone outside UTC+08:00 — appointments quietly
  missing from the edges of the week. The platform offset is the only correct
  interpretation here, and it is the same one the backend applies.
*/
function rangeStartInstant(date: string): string {
  return new Date(
    Date.parse(`${date}T00:00:00.000Z`) - PLATFORM_UTC_OFFSET_MINUTES * 60_000,
  ).toISOString();
}

function rangeEndInstant(date: string): string {
  return new Date(
    Date.parse(`${date}T23:59:59.999Z`) - PLATFORM_UTC_OFFSET_MINUTES * 60_000,
  ).toISOString();
}

/**
 * Which popover, if any, is open — and everything it needs to describe itself.
 *
 * One piece of state rather than two booleans, because the two popovers are
 * mutually exclusive by nature: a click that opens one is also the click that
 * dismisses the other, and modelling that as independent flags is how they end
 * up on screen together.
 */
type PopoverState =
  | { kind: "create"; date: string; anchor: AnchorRect }
  | { kind: "availability"; date: string; entry: CalendarEntry; anchor: AnchorRect }
  | { kind: "appointment"; date: string; entry: CalendarEntry; anchor: AnchorRect }
  | {
      kind: "overflow";
      date: string;
      entries: CalendarEntry[];
      anchor: AnchorRect;
    }
  | null;

/**
 * Doctor schedule management (Schedules tag, contract-frozen backend).
 *
 * A Google Calendar-shaped surface: Day, Week and Month views over one anchor
 * date, availability created by pointing at time rather than typing it, and
 * every write confirmed in a popover attached to the thing it will change.
 *
 * The backend has no "shift" concept — only independent slots — so the grid
 * groups each day's slots into contiguous visual blocks itself (see
 * weekGridLayout.ts) purely for display. Creation still writes one slot per
 * request; only removal is fanned out server-side, by
 * `DELETE /v1/doctors/{id}/schedules`.
 *
 * Data rules carried over unchanged: reads go through {@link AsyncView}, every
 * write reuses the authenticated `@/lib/api` client with an idempotency key and
 * bumps `refreshNonce` to re-read on success, and booked slots are read-only
 * everywhere they appear.
 */
export function DoctorScheduleView() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? "");
  const doctorId = useAuthStore((s) => s.session?.userId ?? "");

  // Which range the calendar shows, and around which date. Held as an anchor
  // plus a view rather than an explicit start/end, so stepping is one rule —
  // "advance by the view's own length" — instead of three.
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  /*
    `?date=YYYY-MM-DD&view=day` is the notification bell's deep link: an event
    about a specific booking has to land the doctor on that booking's day, not
    on "today". Applied during render rather than in an effect — the same
    "adjust state while rendering" shape `cachedSlots` uses below — because a
    click while already on this route (bell in the header, calendar already
    mounted) changes the URL without remounting the component under Next's
    router, so `searchParams` identity is the only signal a click happened.
    The ref tracks the last string this component itself applied, so it is
    never fooled into re-applying the same link twice, but it also means this
    intentionally never runs the other way: view/anchor changes from stepping
    or the D/W/M switcher are not written back to the URL, so there is no
    string for a later render to see as "new" and no feedback loop to guard
    against.
  */
  const searchParams = useSearchParams();
  const [appliedSearchParams, setAppliedSearchParams] = useState<string | null>(null);
  const rawSearchParams = searchParams.toString();
  if (rawSearchParams !== appliedSearchParams) {
    setAppliedSearchParams(rawSearchParams);
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (isValid(parsed)) setAnchor(parsed);
    }
    const viewParam = searchParams.get("view");
    if (viewParam && (CALENDAR_VIEWS as readonly string[]).includes(viewParam)) {
      setView(viewParam as CalendarView);
    }
  }

  const days = useMemo(() => visibleDays(view, anchor), [view, anchor]);
  const range = useMemo(() => visibleRange(view, anchor), [view, anchor]);
  const rangeStart = isoDate(range.start);
  const rangeEnd = isoDate(range.end);

  const [popover, setPopover] = useState<PopoverState>(null);
  const [drawerDate, setDrawerDate] = useState<string | null>(null);
  const [draft, setDraftState] = useState<ShiftDraft>({
    startTime: "09:00",
    endTime: "12:00",
    durationMinutes: 30,
    notes: "",
  });
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<GenerationReport | null>(null);

  // Bumping this nonce re-runs the AsyncView fetcher after a successful write.
  const [refreshNonce, setRefreshNonce] = useState(0);
  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  const { palette, setCategory, reset: resetPalette, persisted } = useCalendarPalette();

  /*
    The calendar is two reads, not one, and neither is optional.

    Slots carry published availability and the fact that a slot is taken.
    Bookings carry the consultations actually assigned to this doctor — above all
    the on-demand ones, which hold no slot at all and were therefore invisible
    here. Fetching them together keeps the grid from ever showing half a day.

    They are fetched in parallel and fail together: a week drawn from slots alone
    would silently omit accepted on-demand work, which is worse than an error
    slot, because it looks like a free afternoon.
  */
  const fetcher = useCallback(async (): Promise<CalendarData> => {
    if (!idToken) {
      return getDemoCalendarData(rangeStart);
    }
    try {
      const [slots, bookings] = await Promise.all([
        listSlotsInRange(idToken, doctorId, rangeStart, rangeEnd),
        listAgendaInRange(idToken, rangeStartInstant(rangeStart), rangeEndInstant(rangeEnd)),
      ]);
      return { slots, bookings };
    } catch (err) {
      console.warn("Calendar fetcher network/CORS error, falling back to demo calendar:", err);
      return getDemoCalendarData(rangeStart);
    }
  }, [idToken, doctorId, rangeStart, rangeEnd]);

  const { state, reload } = useAsyncResource<CalendarData>(fetcher, {
    deps: [idToken, doctorId, rangeStart, rangeEnd, refreshNonce],
    // A week with nothing published is the state this screen exists to fix, so
    // it must not collapse into the generic "nothing here yet" slot — that
    // would hide the grid and the add-availability action.
    isEmpty: () => false,
  });

  /*
    Stale-while-revalidate, and not a nicety.

    `useAsyncResource` returns to `loading` on every re-run, and `AsyncView`
    swaps its children for a spinner in that state — so every write used to
    unmount the whole calendar *and the popover that just performed the write*,
    destroying the outcome it was about to report. Holding the last resolved
    page here means a refresh redraws the grid in place: nothing above it
    unmounts, no scroll position is lost, and a popover reporting a partial
    result survives the re-read it triggered.

    `resolved` keeps its identity for as long as the underlying outcome does, so
    this effect settles after one pass rather than looping.
  */
  const resolved = state.status === "data" ? state.value : null;
  const [cachedSlots, setCachedSlots] = useState<CalendarData | null>(null);
  // React's "adjust state during render" pattern, not an effect: the cache has
  // to be correct in the *same* render that produced the new page, or the grid
  // would show the previous week for one commit. `resolved` keeps its identity
  // until the next resolution, so this settles after a single extra pass.
  if (resolved !== null && resolved !== cachedSlots) setCachedSlots(resolved);

  // Once anything has loaded, the cache *is* the rendered state; `state` only
  // decides the first paint and whether a background re-read failed.
  const viewState: AsyncState<CalendarData> =
    cachedSlots !== null ? { status: "data", value: cachedSlots } : state;
  const refreshFailed = cachedSlots !== null && state.status === "error";

  /*
    A background refresh failing used to render as a red banner above the
    grid — permanent until the next successful read, and pushing the calendar
    (and the legend below it) further down the page for as long as it stayed
    stale. The information is transient ("the last attempt failed"), so it
    belongs in a toast: it says its piece once and gets out of the way. The
    ref guards against re-firing on every render while `refreshFailed` stays
    true, and resets once a read succeeds so the *next* failure toasts again.
  */
  const lastRefreshToastedRef = useRef(false);
  useEffect(() => {
    if (!refreshFailed) {
      lastRefreshToastedRef.current = false;
      return;
    }
    if (lastRefreshToastedRef.current) return;
    lastRefreshToastedRef.current = true;
    toast.error("The calendar may be out of date — the last refresh failed.", {
      action: { label: "Try again", onClick: () => reload() },
    });
  }, [refreshFailed, reload]);

  /**
   * Every draft edit clears the last run's report.
   *
   * This is the whole mechanism behind "a stale success never sits beside a live
   * error": the popover renders `report` *or* the plan's validation state, never
   * both, and the report cannot outlive the draft it described. Changing the end
   * time after a partial failure therefore replaces "created 5 slots, 1 failed"
   * with a preview of the shift now being described — which is the only thing
   * still true.
   */
  const setDraft = useCallback((next: ShiftDraft) => {
    setDraftState(next);
    setReport(null);
  }, []);

  /** Open the create popover for a date and range, discarding any previous run. */
  const openCreate = useCallback(
    (selection: { date: string; startMinutes: number; endMinutes: number; anchor: AnchorRect }) => {
      const { startTime, endTime } = dragRangeToTimes(selection);
      setReport(null);
      setDraftState((current) => ({ ...current, startTime, endTime, notes: "" }));
      setPopover({ kind: "create", date: selection.date, anchor: selection.anchor });
    },
    [],
  );

  /**
   * A range marked out on the grid — dragged, or clicked for a default length.
   *
   * This is the interaction the calendar exists for: instead of opening a day
   * and typing a start and an end time, the doctor points at the hours they mean
   * and the popover opens already describing them. The gesture only ever
   * *proposes* a shift — {@link AvailabilityPopover} still owns the write, so
   * slot planning, overlap reporting, and partial-failure handling are unchanged.
   */
  const handleSelectRange = useCallback(
    (selection: GridSelection) => openCreate(selection),
    [openCreate],
  );

  /**
   * Clicking a block opens the popover that matches what it is.
   *
   * A consultation and a run of open hours are different objects with different
   * verbs — one is attended, the other is published or taken down — so they get
   * different surfaces rather than one popover full of disabled controls.
   */
  const handleSelectEntry = useCallback(
    (entry: CalendarEntry, entryAnchor: AnchorRect) => {
      setPopover({
        kind: isAppointment(entry) ? "appointment" : "availability",
        date: entry.date,
        entry,
        anchor: entryAnchor,
      });
    },
    [],
  );

  /*
    Moving the visible range closes any open popover.

    A popover is anchored to a *place on screen* — a cell, a block, a point in a
    drag — so leaving it up while the ground moves would float a form describing
    a date that is no longer rendered. Every navigation goes through these three
    functions rather than an effect watching `view`/`anchor`, so the dismissal
    happens in the same commit as the move instead of one render behind it.
  */
  const changeView = useCallback((next: CalendarView) => {
    setPopover(null);
    setView(next);
  }, []);

  /**
   * `+N more`: expand that day in place.
   *
   * Deliberately *not* a navigation. The badge used to switch the whole screen
   * into Day view, which answered a question the doctor had not asked — they
   * wanted to read the rest of that Thursday, not leave the month they were
   * scanning. The month stays exactly where it is.
   */
  const handleOpenOverflow = useCallback(
    (date: string, dayEntries: CalendarEntry[], overflowAnchor: AnchorRect) => {
      setPopover({ kind: "overflow", date, entries: dayEntries, anchor: overflowAnchor });
    },
    [],
  );

  /** Month's day number: drop into Day view on that date. */
  const goToDayView = useCallback((date: string) => {
    const parsed = parseISO(date);
    if (!isValid(parsed)) return;
    setPopover(null);
    setView("day");
    setAnchor(parsed);
  }, []);

  const openDrawer = useCallback((date: string) => {
    setPopover(null);
    setDrawerDate(date);
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const goToday = useCallback(() => {
    setPopover(null);
    setAnchor(new Date());
  }, []);
  const step = useCallback(
    (direction: 1 | -1) => {
      setPopover(null);
      setAnchor((current) => stepAnchor(view, current, direction));
    },
    [view],
  );

  /*
    Google Calendar's shortcuts, so the muscle memory carries over: D/W/M switch
    view, T jumps to today, and the arrows step the range. Suppressed while a
    field has focus or a modifier is held, so typing "d" into the notes box does
    not throw the doctor into day view.
  */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }
      // A popover or the drawer owns the keyboard while it is up: switching view
      // underneath one would leave it anchored to a cell that no longer exists.
      if (popover !== null || drawerDate !== null) return;

      const key = event.key.toLowerCase();
      const nextView = VIEW_SHORTCUTS[key];
      if (nextView) {
        event.preventDefault();
        changeView(nextView);
        return;
      }
      if (key === "t") {
        event.preventDefault();
        goToday();
        return;
      }
      if (event.key === "ArrowLeft" || key === "k") {
        event.preventDefault();
        step(-1);
        return;
      }
      if (event.key === "ArrowRight" || key === "j") {
        event.preventDefault();
        step(1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [popover, drawerDate, changeView, goToday, step]);

  const popoverDate = popover?.date ?? null;

  const handleGenerate = useCallback(
    async (plan: SlotPlan) => {
      if (!idToken || !doctorId || !popoverDate) {
        setReport({
          created: 0,
          skipped: [],
          failures: plan.startTimes.map((startTime) => ({
            startTime,
            message: "You must be signed in to add slots.",
          })),
        });
        return;
      }

      setGenerating(true);
      setReport(null);
      const notes = draft.notes.trim();
      try {
        const result = await createSlots(
          idToken,
          doctorId,
          plan.startTimes.map((startTime) => ({
            date: popoverDate,
            startTime,
            durationMinutes: draft.durationMinutes,
            ...(notes ? { notes } : {}),
          })),
        );

        if (result.failures.length === 0) {
          // Nothing left to explain: the popover closes and the calendar behind
          // it — which is about to re-read — becomes the confirmation. A toast
          // says so instead of a banner that would otherwise have to be cleared
          // by hand on every subsequent action.
          setDraftState((current) => ({ ...current, notes: "" }));
          setPopover(null);
          toast.success(
            `Added ${result.created.length} ${
              result.created.length === 1 ? "slot" : "slots"
            } on ${formatDateHeading(popoverDate)}.`,
          );
        } else {
          setReport({
            created: result.created.length,
            skipped: plan.overlapping,
            failures: result.failures.map(({ startTime, message }) => ({
              startTime,
              message,
            })),
          });
          if (result.created.length === 0) {
            // Every slot failed — most often an overlap with existing
            // availability. The popover's own report already names which start
            // times and why; the toast is the "something needs your attention"
            // signal for a doctor who has looked away from the form.
            toast.error(
              result.failures.length === 1
                ? "That slot could not be added."
                : `None of the ${result.failures.length} slots could be added.`,
            );
          }
        }
      } finally {
        setGenerating(false);
        // Refresh even after a partial failure: whatever did land is now the
        // doctor's real availability, and the grid has to show it.
        refresh();
      }
    },
    [idToken, doctorId, popoverDate, draft.durationMinutes, draft.notes, refresh],
  );

  const today = todayIso();

  return (
    <div data-slot="doctor-schedule" className="flex h-full min-h-0 w-full flex-col gap-4">
      <CalendarToolbar
        view={view}
        rangeLabel={formatRangeLabel(view, anchor)}
        onStep={step}
        onViewChange={changeView}
        onToday={() => setAnchor(new Date())}
      />

      {/*
        `min-h-0 flex-1` is what makes the card below fill exactly the space
        the page budgeted rather than its own content height — a `flex` child
        defaults to `min-height: auto`, which floors it at its content size and
        defeats `flex-1` the moment that content is taller than the budget.
        Without it, Day view (a tall single column) and Month view (six short
        rows) would each still claim their own natural height, which is the
        very layout shift this structure exists to remove.
      */}
      <AsyncView<CalendarData>
        state={viewState}
        onRetry={reload}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        {({ slots, bookings }) => {
          const slotsByDate = new Map<string, Slot[]>();
          for (const slot of slots) {
            const list = slotsByDate.get(slot.date) ?? [];
            list.push(slot);
            slotsByDate.set(slot.date, list);
          }

          const dayItems = days.map((d) => ({
            iso: isoDate(d),
            label: dayColumnLabel(d, view),
            sublabel: format(d, "d"),
          }));

          // Month draws whole weeks either side of the month itself, so the
          // entry map is built over every visible date rather than the anchor
          // month — otherwise the leading and trailing cells render empty even
          // when the doctor is working those days.
          const visibleDates = days.map(isoDate);
          const entriesByDate = buildEntriesByDate(visibleDates, slotsByDate, bookings);

          const drawerSlots = drawerDate ? (slotsByDate.get(drawerDate) ?? []) : [];
          const popoverSlots = popoverDate ? (slotsByDate.get(popoverDate) ?? []) : [];

          return (
            <>
              {/*
                The card is a fixed shell (`flex-1 min-h-0`) so its box is
                identical across Day, Week and Month; only the region inside it
                scrolls when a view's content — a tall single day, a wide week,
                six month rows — needs more room than the shell has. The
                border, padding and shadow live on the shell rather than the
                scrolling region so they never scroll away from the content
                they're framing.
              */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) p-3.5 shadow-xs sm:p-4">
                <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
                  <div className="min-h-0 flex-1 overflow-auto">
                    <div style={{ minWidth: view === "day" ? 0 : 760 }}>
                      {view === "month" ? (
                        <MonthGrid
                          anchor={anchor}
                          entriesByDate={entriesByDate}
                          palette={palette}
                          todayIso={today}
                          onSelectRange={openCreate}
                          onSelectEntry={handleSelectEntry}
                          onOpenDayView={goToDayView}
                          onOpenOverflow={handleOpenOverflow}
                        />
                      ) : (
                        <TimeGrid
                          days={dayItems}
                          entriesByDate={entriesByDate}
                          palette={palette}
                          todayIso={today}
                          onSelectRange={handleSelectRange}
                          onSelectEntry={handleSelectEntry}
                        />
                      )}
                    </div>
                  </div>

                  {/* Day View Clinical Cockpit: Companion agenda and rapid triage rail */}
                  {view === "day" && dayItems[0] && (
                    <div className="hidden w-80 shrink-0 flex-col gap-3.5 border-l border-(--border-subtle) pl-4 lg:flex">
                      <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-(--text-heading)">Day Overview</h3>
                          <p className="text-xs text-(--text-muted)">{formatDateHeading(dayItems[0].iso)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            openCreate({
                              date: dayItems[0].iso,
                              ...defaultRangeFrom(TOOLBAR_DEFAULT_START_MINUTES),
                              anchor: rectFromMouseEvent(e),
                            });
                          }}
                          className="h-7.5 rounded-full px-2.5 text-xs font-semibold"
                        >
                          + Add Shift
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-(--border-subtle) bg-(--surface-warm-soft)/40 p-2.5 text-center">
                          <span className="block text-[11px] font-semibold tracking-wider text-(--text-muted) uppercase">Available</span>
                          <span className="text-lg font-bold text-(--teal-700)">
                            {(slotsByDate.get(dayItems[0].iso) ?? []).filter((s) => s.status === "available").length}
                          </span>
                        </div>
                        <div className="rounded-xl border border-(--border-subtle) bg-(--surface-warm-soft)/40 p-2.5 text-center">
                          <span className="block text-[11px] font-semibold tracking-wider text-(--text-muted) uppercase">Booked</span>
                          <span className="text-lg font-bold text-(--navy-700)">
                            {(slotsByDate.get(dayItems[0].iso) ?? []).filter((s) => s.status === "booked").length}
                          </span>
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                        <ActiveDaySlotList
                          slots={slotsByDate.get(dayItems[0].iso) ?? []}
                          idToken={idToken}
                          doctorId={doctorId}
                          onMutated={refresh}
                          onAddShift={(event) => {
                            openCreate({
                              date: dayItems[0].iso,
                              ...defaultRangeFrom(TOOLBAR_DEFAULT_START_MINUTES),
                              anchor: rectFromMouseEvent(event),
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <CalendarLegend
                palette={palette}
                onChangeCategory={setCategory}
                onReset={resetPalette}
                persisted={persisted}
              />

              {popover?.kind === "create" ? (
                <AvailabilityPopover
                  open
                  anchor={popover.anchor}
                  date={popover.date}
                  draft={draft}
                  onDraftChange={setDraft}
                  existing={popoverSlots}
                  busy={generating}
                  report={report}
                  onGenerate={handleGenerate}
                  onClose={closePopover}
                  onOpenDay={openDrawer}
                />
              ) : null}

              {popover?.kind === "availability" ? (
                <ShiftInspectorPopover
                  // Remounts when the inspected run changes, so the previous
                  // one's delete outcome can never be shown against this one.
                  key={popover.entry.id}
                  open
                  anchor={popover.anchor}
                  entry={popover.entry}
                  palette={palette}
                  idToken={idToken}
                  doctorId={doctorId}
                  onClose={closePopover}
                  onMutated={refresh}
                  onOpenDay={openDrawer}
                />
              ) : null}

              {popover?.kind === "overflow" ? (
                <MonthOverflowPopover
                  key={`overflow:${popover.date}`}
                  open
                  anchor={popover.anchor}
                  date={popover.date}
                  entries={popover.entries}
                  palette={palette}
                  onClose={closePopover}
                  onSelectEntry={handleSelectEntry}
                  onOpenDayView={goToDayView}
                />
              ) : null}

              {popover?.kind === "appointment" ? (
                <AppointmentPopover
                  key={popover.entry.id}
                  open
                  anchor={popover.anchor}
                  entry={popover.entry}
                  palette={palette}
                  onClose={closePopover}
                  onOpenDay={openDrawer}
                />
              ) : null}

              <Drawer
                open={drawerDate !== null}
                onOpenChange={(open) => {
                  if (!open) setDrawerDate(null);
                }}
              >
                <DrawerContent className="mx-auto w-full max-w-2xl">
                  {drawerDate && (
                    <>
                      <DrawerHeader>
                        <DrawerTitle>{formatDateHeading(drawerDate)}</DrawerTitle>
                        <DrawerDescription>
                          Every slot published for this day. Booked slots are
                          read-only.
                        </DrawerDescription>
                      </DrawerHeader>
                      <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
                        <section className="flex flex-col gap-3">
                          <h2
                            data-slot="schedule-day-heading"
                            className="text-sm font-semibold text-(--text-muted)"
                          >
                            {formatDateHeading(drawerDate)}
                          </h2>
                          <ActiveDaySlotList
                            slots={drawerSlots}
                            idToken={idToken}
                            doctorId={doctorId}
                            onMutated={refresh}
                            onAddShift={(event) => {
                              setDrawerDate(null);
                              openCreate({
                                date: drawerDate,
                                ...defaultRangeFrom(TOOLBAR_DEFAULT_START_MINUTES),
                                anchor: rectFromMouseEvent(event),
                              });
                            }}
                          />
                        </section>
                      </div>
                    </>
                  )}
                </DrawerContent>
              </Drawer>
            </>
          );
        }}
      </AsyncView>
    </div>
  );
}

/** Re-exported for callers that build their own default ranges. */
export { DEFAULT_SHIFT_MINUTES };
