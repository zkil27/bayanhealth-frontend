"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Daily, { type DailyCall, type DailyParticipant } from "@daily-co/daily-js";
import {
  AlertCircleIcon,
  MessagesSquare,
  Mic,
  MicOff,
  Settings2,
  ShieldAlert,
  Video,
  VideoOff,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, newIdempotencyKey } from "@/lib/api";
import { useIdToken } from "@/stores/useAuthStore";

import {
  createVideoSession,
  readVideoSession,
  type VideoSessionCredential,
} from "../lib/api/videoSession";

/**
 * `<ConsultationVideo />` — the only frontend module that references
 * Video_Provider specifics (Requirement 20.1, consultation-media-layer task 11.1).
 *
 * Built on Daily's **Call Object** mode (`Daily.createCallObject`) rather than the
 * hosted Prebuilt iframe (`createFrame`). This is a deliberate change from the
 * original design, made after four consecutive live bugs traced to one root cause:
 * embedding Prebuilt's iframe while also layering a custom connecting overlay and
 * custom camera/mic controls on top of it is a hybrid of Daily's two integration
 * modes, and every one of Prebuilt's un-set defaults (CSP framing, Permissions-Policy,
 * its own prejoin lobby, its own chat/screenshare/knocking UI) kept surfacing as a bug
 * one at a time instead of being decided once. Call Object mode has no iframe and no
 * Daily-owned UI at all — no CSP `frame-src`, no cross-origin Permissions-Policy grant,
 * no prejoin lobby, no vendor chat panel to accidentally leave enabled. This component
 * owns 100% of the rendered UI and always will, which also means it is already the
 * shape of the fully custom video UI this product intends to build long-term — there
 * is no second migration later, only refinement of what is already here.
 *
 * Room-level UI toggles (`enable_chat`, `enable_screenshare`, etc.) set on the backend
 * in `lib/video-provider.ts` are now dead configuration in this mode — Call Object
 * never renders any Daily UI for them to gate — but are left in place rather than
 * removed, because a future swap back to Prebuilt (or a different provider entirely)
 * should not have to rediscover the same decisions.
 *
 * Behaviours (see design.md C12 and requirements.md Requirement 20):
 * - Joins with the local camera and microphone both inactive, so each media
 *   track begins only after an explicit participant action.
 * - A camera toggle enables/disables only the local video track, never touching
 *   the audio track (R20.3, R20.4).
 * - Both controls carry accessible names and are keyboard operable — native
 *   `<button>` elements via `Button` (R20.8).
 * - Requests a Join_Credential only while the Booking is `confirmed` or
 *   `in_progress` (R20.6), and holds it in memory for this component instance's
 *   lifetime only — it is never written to `localStorage`/`sessionStorage`
 *   (R8.9). It is re-minted with a fresh `POST` at the end of its 30-minute
 *   lifetime rather than refreshed in place (R20.9, R8.7).
 * - A `GET` `404` is "no room yet", not an error (R20.10).
 * - `VIDEO_PROVIDER_UNAVAILABLE` / `VIDEO_DISABLED` render a chat-only state
 *   directing the participant to the existing Chat_Channel (R20.5).
 * - `429 VIDEO_CREDENTIAL_MINT_LIMIT` while connected keeps the call running
 *   with a non-blocking notice, honouring `Retry-After` and issuing no earlier
 *   retry (R20.12, R20.13); while not connected it shows the chat-available
 *   state instead (R20.14).
 * - A third-party transport notice is shown to both participants before their
 *   first join, accessible and keyboard operable, and is explicitly not a
 *   Consent_Record and submits no consent (R20.11, R22.1). It sits on the
 *   same pre-join panel as the camera/microphone device test and the join
 *   confirmation step, rather than as a separate acknowledgement screen —
 *   both participants see it once, immediately before the action that
 *   actually connects them.
 * - Chat, presence, and typing are never touched here — they remain owned by
 *   the existing Chat_Channel components (R20.7, R22.8). This component only
 *   renders the media surface; the caller is responsible for rendering chat
 *   alongside it.
 *
 * `next.config.ts` and `src/proxy.ts` still carry a `frame-src` and a widened
 * `Permissions-Policy` for the two Daily origins from the earlier Prebuilt attempt.
 * Call Object mode needs neither (there is no iframe to frame, and getUserMedia now
 * runs in this same-origin document), but they are left in place rather than removed:
 * they are harmless once unused, and removing them is a distraction from this change.
 * `proxy.ts`'s `connect-src` gains the same two origins (`https://*.daily.co`,
 * `https://*.dailywebrtc.com`, plus `dailywebrtc.net` and their `wss:` forms) that
 * Call Object's WebRTC signalling needs, since that traffic now originates from this
 * document directly rather than from inside a vendor iframe with its own policy.
 */

/** Booking statuses during which a Join_Credential may be requested (R20.6, R7). */
const VIDEO_ELIGIBLE_STATUSES: ReadonlySet<string> = new Set(["confirmed", "in_progress"]);

/**
 * Join_Credential lifetime, mirrored from the backend's
 * `VIDEO_JOIN_CREDENTIAL_TTL_SECONDS` (Requirement 8.6). The component derives
 * its re-mint timer from the credential's own `expiresAt` rather than this
 * constant directly, so a provider-side deviation from 30 minutes is still
 * honoured; this is retained only as a fallback and as documentation.
 */
const JOIN_CREDENTIAL_LIFETIME_SECONDS = 30 * 60;

type VideoPanelState =
  /** Booking not yet eligible, or eligibility not yet determined. */
  | { kind: "ineligible" }
  /** Pre-join: third-party transport notice, device test, and join confirmation. */
  | { kind: "notice" }
  /** No room exists yet ( `GET` 404 ); offering the "start call" affordance. */
  | { kind: "no-room" }
  /** A credential mint or room read is in flight. */
  | { kind: "connecting" }
  /** Joined the provider room. */
  | { kind: "connected" }
  /** Provider degraded — chat-only, directing to the existing Chat_Channel. */
  | { kind: "chat-only"; reason: "provider-unavailable" | "video-disabled" }
  /** Mint ceiling hit while not connected (Requirement 20.14). */
  | { kind: "chat-available"; retryAfterSeconds?: number }
  /** Any other failure. */
  | { kind: "error"; message: string };

/** One tile's renderable media state, keyed by Daily session_id. */
interface ParticipantTile {
  sessionId: string;
  isLocal: boolean;
  label: string;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
}

function toTile(participant: DailyParticipant): ParticipantTile {
  return {
    sessionId: participant.session_id,
    isLocal: participant.local,
    // `user_name` carries the role label minted server-side (Requirement 8.8),
    // never a person's name — see `mintJoinCredential` in lib/video-provider.ts.
    label: participant.local ? "You" : participant.user_name || "Participant",
    videoTrack: participant.tracks.video.persistentTrack ?? null,
    audioTrack: participant.tracks.audio.persistentTrack ?? null,
  };
}

export interface ConsultationVideoProps {
  bookingId: string;
  /** Current booking lifecycle status, used to gate credential requests (R20.6). */
  bookingStatus: string | null | undefined;
}

export function ConsultationVideo({ bookingId, bookingStatus }: ConsultationVideoProps) {
  const idToken = useIdToken();
  const isEligible = !!bookingStatus && VIDEO_ELIGIBLE_STATUSES.has(bookingStatus);

  // Third-party transport notice acknowledgement lives in component state only —
  // it is disclosure of the transport arrangement (R18.9), not a Consent_Record,
  // and this component submits no consent request for it (R20.11, R22.1).
  const [noticeAcknowledged, setNoticeAcknowledged] = useState(false);
  // Pre-join device check and join-confirmation dialogs. Both are plain UI
  // state — neither gates credential requests, which only ever fire from
  // `handleAcknowledgeNotice` once the participant confirms joining.
  const [deviceTestOpen, setDeviceTestOpen] = useState(false);
  const [joinConfirmOpen, setJoinConfirmOpen] = useState(false);

  const [panel, setPanel] = useState<VideoPanelState>(
    isEligible ? { kind: "notice" } : { kind: "ineligible" },
  );

  // Held in memory for this component instance's lifetime only — never in
  // localStorage/sessionStorage (Requirement 8.9).
  const credentialRef = useRef<VideoSessionCredential | null>(null);
  const callRef = useRef<DailyCall | null>(null);
  const remintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryNotBeforeRef = useRef<number>(0);
  // Daily enforces a single live call instance per page regardless of mode (it
  // throws "Duplicate DailyIframe instances are not allowed" if a second
  // `createCallObject`/`createFrame` runs before the first finishes
  // `destroy()`ing). This generation counter lets `joinRoom` await the previous
  // instance's teardown and then detect whether a second teardown/join raced
  // ahead of it while it was awaiting — e.g. an eligibility flip, an unmount, or
  // a double-fired trigger — so the stale attempt destroys its own instance
  // instead of leaving two alive.
  const callGenerationRef = useRef(0);

  const [tiles, setTiles] = useState<Map<string, ParticipantTile>>(new Map());
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [mintLimitNotice, setMintLimitNotice] = useState<number | undefined>(undefined);

  const clearRemintTimer = useCallback(() => {
    if (remintTimerRef.current) {
      clearTimeout(remintTimerRef.current);
      remintTimerRef.current = null;
    }
  }, []);

  // Bumps the generation so any in-flight `joinRoom` that started before this
  // teardown knows, once its own `destroy()` await resolves, that it is now
  // stale and must not proceed. Returns the destroy promise so a caller that
  // needs the previous instance gone *before* creating the next one (joinRoom)
  // can await it, rather than firing an unawaited `destroy()` and racing the
  // next `createCallObject` against it — that race is what previously produced
  // "Duplicate DailyIframe instances are not allowed" under Prebuilt, and the
  // restriction is shared across both modes.
  const teardownCall = useCallback((): Promise<void> => {
    callGenerationRef.current += 1;
    clearRemintTimer();
    const call = callRef.current;
    callRef.current = null;
    credentialRef.current = null;
    setTiles(new Map());
    if (!call) return Promise.resolve();
    return call.destroy().then(
      () => undefined,
      () => {
        // Best-effort cleanup; nothing productive to do with a destroy failure.
      },
    );
  }, [clearRemintTimer]);

  useEffect(() => {
    return () => {
      void teardownCall();
    };
  }, [teardownCall]);

  // Eligibility window changed (e.g. the booking left `confirmed`/`in_progress`):
  // tear down any live call and reset to the appropriate non-connected state.
  // Requests a credential only while eligible (Requirement 20.6, 23.9).
  useEffect(() => {
    if (!isEligible) {
      void teardownCall();
      setPanel({ kind: "ineligible" });
      return;
    }
    setPanel((prev) => (prev.kind === "ineligible" ? { kind: "notice" } : prev));
  }, [isEligible, teardownCall]);

  const requestCredential = useCallback(
    async (idempotencyKey?: string): Promise<VideoSessionCredential | null> => {
      if (!idToken) {
        setPanel({ kind: "error", message: "You must be signed in to join the video call." });
        return null;
      }
      try {
        const credential = await createVideoSession(idToken, bookingId, idempotencyKey);
        return credential;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === "VIDEO_PROVIDER_UNAVAILABLE") {
            setPanel({ kind: "chat-only", reason: "provider-unavailable" });
            return null;
          }
          if (err.code === "VIDEO_DISABLED") {
            setPanel({ kind: "chat-only", reason: "video-disabled" });
            return null;
          }
          if (err.code === "VIDEO_CREDENTIAL_MINT_LIMIT") {
            const retryAfter = err.retryAfterSeconds;
            if (callRef.current) {
              // Already connected: keep the call running, show a non-blocking
              // notice, and remember the earliest permitted retry (R20.12, R20.13).
              retryNotBeforeRef.current = Date.now() + (retryAfter ?? 0) * 1000;
              setMintLimitNotice(retryAfter);
              return null;
            }
            // Not connected: chat-available state rather than retrying (R20.14).
            setPanel({ kind: "chat-available", retryAfterSeconds: retryAfter });
            return null;
          }
        }
        setPanel({
          kind: "error",
          message: err instanceof Error ? err.message : "Could not start the video call.",
        });
        return null;
      }
    },
    [bookingId, idToken],
  );

  // A ref indirection so the recursive re-mint chain below never has to
  // reference `scheduleRemint` before its own `useCallback` assignment
  // completes — the ref is always readable by the time the timer fires.
  const scheduleRemintRef = useRef<(credential: VideoSessionCredential) => void>(() => {});

  const scheduleRemint = useCallback(
    (credential: VideoSessionCredential) => {
      clearRemintTimer();
      const expiresAtMs = Date.parse(credential.expiresAt);
      const delayMs = Number.isFinite(expiresAtMs)
        ? Math.max(0, expiresAtMs - Date.now())
        : JOIN_CREDENTIAL_LIFETIME_SECONDS * 1000;

      remintTimerRef.current = setTimeout(() => {
        // Re-mint by a fresh POST rather than refreshing the expired value in
        // place (Requirement 20.9, 8.7). The existing media session, if the
        // provider permits, keeps running while this happens — nothing here
        // tears the call down before the new credential arrives.
        void requestCredential(newIdempotencyKey()).then((next) => {
          if (next) {
            credentialRef.current = next;
            scheduleRemintRef.current(next);
          }
        });
      }, delayMs);
    },
    [clearRemintTimer, requestCredential],
  );
  useEffect(() => {
    scheduleRemintRef.current = scheduleRemint;
  }, [scheduleRemint]);

  const refreshTiles = useCallback((call: DailyCall) => {
    const participants = call.participants();
    setTiles(
      new Map(Object.values(participants).map((p) => [p.session_id, toTile(p)])),
    );
  }, []);

  const joinRoom = useCallback(
    async (credential: VideoSessionCredential) => {
      // Await the previous instance's destroy() before creating the next one —
      // Daily throws "Duplicate DailyIframe instances are not allowed" if a
      // second call-object instance is created while the first is still live.
      // `teardownCall` bumps the generation counter; capture the value AFTER
      // teardown so this call's generation is the current one, then re-check
      // it once the await resolves to detect whether a second teardown/join
      // raced in during the await (e.g. eligibility flipped or the component
      // unmounted).
      await teardownCall();
      const myGeneration = callGenerationRef.current;
      if (callGenerationRef.current !== myGeneration) return;

      credentialRef.current = credential;

      const call = Daily.createCallObject({
        url: credential.roomUrl,
        token: credential.token,
        // Both tracks inactive on join — neither participant is heard or seen
        // until they deliberately turn a control on.
        startVideoOff: true,
        startAudioOff: true,
        dailyConfig: {
          // Daily's default loader fetches its call-machine bundle and
          // evaluates it as a string, which `script-src` here refuses because
          // it carries no `'unsafe-eval'` — surfaced as "Failed to load call
          // object bundle ... EvalError: Evaluating a string as JavaScript
          // violates the following Content Security Policy directive".
          // `avoidEval` switches Daily to a loader that injects a `<script>`
          // element instead (confirmed in the installed bundle: the
          // alternate loader holds a `_scriptElement` and never calls eval).
          // `script-src` already carries `'strict-dynamic'`, which permits a
          // script injected by already-trusted nonced script and makes host
          // allowlists irrelevant for scripts, so this needs no CSP change —
          // and specifically does NOT require weakening it with
          // `'unsafe-eval'`, which would apply to every script on every page.
          avoidEval: true,
        },
      });

      callRef.current = call;

      const onParticipantChange = () => refreshTiles(call);
      call.on("participant-joined", onParticipantChange);
      call.on("participant-updated", onParticipantChange);
      call.on("participant-left", onParticipantChange);
      call.on("track-started", onParticipantChange);
      call.on("track-stopped", onParticipantChange);
      call.on("left-meeting", () => {
        setPanel({ kind: "no-room" });
      });
      call.on("error", (event) => {
        setPanel({
          kind: "error",
          message: event?.errorMsg ?? "The video call ran into a problem.",
        });
      });

      await call.join();
      if (callGenerationRef.current !== myGeneration) {
        // Superseded while `join()` was in flight — leave state changes to
        // whichever teardown/join won; do not resurrect this stale instance.
        return;
      }
      setCameraOn(false);
      setMicOn(false);
      refreshTiles(call);
      setPanel({ kind: "connected" });
      scheduleRemint(credential);
    },
    [teardownCall, refreshTiles, scheduleRemint],
  );

  const handleAcknowledgeNotice = useCallback(() => {
    setNoticeAcknowledged(true);
    setPanel({ kind: "connecting" });
    void (async () => {
      // A room may already exist from the other participant. `GET` is safe and
      // side-effect free (Requirement 4), and a 404 is "no room yet" rather than
      // an error (Requirement 20.10) — so a fresh room offers the start
      // affordance instead of immediately minting a credential.
      if (idToken) {
        try {
          const existing = await readVideoSession(idToken, bookingId);
          if (existing === null) {
            setPanel({ kind: "no-room" });
            return;
          }
        } catch {
          // Fall through to requestCredential, which classifies the
          // provider-unavailable/disabled/mint-limit outcomes precisely.
        }
      }
      const credential = await requestCredential(newIdempotencyKey());
      if (credential) {
        await joinRoom(credential);
      }
    })();
  }, [bookingId, idToken, joinRoom, requestCredential]);

  const handleStartCall = useCallback(() => {
    setPanel({ kind: "connecting" });
    void (async () => {
      const credential = await requestCredential(newIdempotencyKey());
      if (credential) {
        await joinRoom(credential);
      }
    })();
  }, [joinRoom, requestCredential]);

  const toggleCamera = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const next = !cameraOn;
    // Enables/disables only the local video track; the audio track is never
    // touched by this control (Requirement 20.3, 20.4).
    call.setLocalVideo(next);
    setCameraOn(next);
  }, [cameraOn]);

  const toggleMic = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const next = !micOn;
    call.setLocalAudio(next);
    setMicOn(next);
  }, [micOn]);

  if (panel.kind === "ineligible") {
    return null;
  }

  if (panel.kind === "notice") {
    return (
      <>
        <PreJoinPanel
          onOpenDeviceTest={() => setDeviceTestOpen(true)}
          onOpenJoinConfirm={() => setJoinConfirmOpen(true)}
          joining={noticeAcknowledged}
        />
        <DeviceTestModal open={deviceTestOpen} onOpenChange={setDeviceTestOpen} />
        <JoinConfirmDialog
          open={joinConfirmOpen}
          onOpenChange={setJoinConfirmOpen}
          onConfirm={handleAcknowledgeNotice}
        />
      </>
    );
  }

  if (panel.kind === "chat-only") {
    return <ChatOnlyPanel reason={panel.reason} />;
  }

  if (panel.kind === "chat-available") {
    return <ChatAvailablePanel retryAfterSeconds={panel.retryAfterSeconds} />;
  }

  if (panel.kind === "error") {
    return (
      <Alert
        variant="destructive"
        data-slot="consultation-video-error"
        className="rounded-2xl border-rose-200 bg-rose-50 text-rose-900"
      >
        <AlertCircleIcon className="h-4 w-4" />
        <AlertTitle>Video call problem</AlertTitle>
        <AlertDescription>{panel.message}</AlertDescription>
      </Alert>
    );
  }

  if (panel.kind === "no-room") {
    return (
      <section
        data-slot="consultation-video-no-room"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-(--surface-card) p-4"
      >
        <div className="flex items-center gap-2">
          <Video className="size-5 shrink-0 text-(--surface-nav)" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Video consultation</p>
            <p className="text-xs text-slate-500">
              No call has started yet. Chat stays available either way.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleStartCall} className="rounded-xl bg-(--surface-nav) text-white hover:bg-(--surface-nav)/90">
          Start video call
        </Button>
      </section>
    );
  }

  // "connecting" and "connected" both render the hero/PiP stage. Unlike the
  // earlier Prebuilt-iframe version, there is no `display: none` hazard here —
  // no network-affecting media work runs against these `<video>`/`<audio>`
  // elements until `call.join()` resolves and tracks start, so hiding them
  // before then costs nothing. The spinner is a normal overlay by convention,
  // not a workaround for a Daily rendering constraint.
  //
  // Layout: the remote participant (if any) fills the entire stage as a
  // full-bleed hero; the local tile floats over it as a small picture-in-
  // picture thumbnail. A two-tile side-by-side grid sized to its own content
  // (the previous layout) left most of this panel's height — set by its
  // sibling, the companion drawer — as empty dark teal space once the call
  // connected, since neither tile had any reason to grow past ~10rem tall.
  const remoteTile = Array.from(tiles.values()).find((tile) => !tile.isLocal);
  const localTile = Array.from(tiles.values()).find((tile) => tile.isLocal);

  return (
    <section data-slot="consultation-video" className="flex h-full min-h-0 flex-1 flex-col gap-2 md:gap-3">
      <div
        data-slot="consultation-video-stage"
        className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-(--surface-nav) md:min-h-64 md:rounded-2xl"
      >
        {remoteTile ? (
          <ParticipantVideoTile tile={remoteTile} variant="hero" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-teal-100/70">
            <VideoOff className="size-6" />
            <span className="text-xs">Waiting for the other participant to join…</span>
          </div>
        )}

        {localTile ? (
          <div className="absolute top-2 right-2 z-20 aspect-video w-28 overflow-hidden rounded-lg border-2 border-white/20 shadow-xl sm:top-auto sm:right-4 sm:bottom-4 sm:w-56 sm:rounded-xl">
            <ParticipantVideoTile tile={localTile} variant="pip" />
          </div>
        ) : null}

        {panel.kind === "connected" ? (
          <div
            data-slot="consultation-video-controls"
            className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/50 px-2.5 py-1.5 backdrop-blur-md sm:bottom-4"
          >
            <Button
              size="icon"
              onClick={toggleMic}
              aria-label={micOn ? "Turn microphone off" : "Turn microphone on"}
              aria-pressed={micOn}
              className={
                micOn
                  ? "size-11 rounded-full bg-(--white)/10 text-(--white) hover:bg-(--white)/20"
                  : "size-11 rounded-full bg-(--navy-600) text-white hover:bg-(--navy-700)"
              }
            >
              {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            </Button>
            <Button
              size="icon"
              onClick={toggleCamera}
              aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
              aria-pressed={cameraOn}
              className={
                cameraOn
                  ? "size-11 rounded-full bg-(--white)/10 text-(--white) hover:bg-(--white)/20"
                  : "size-11 rounded-full bg-(--navy-600) text-white hover:bg-(--navy-700)"
              }
            >
              {cameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
            </Button>
          </div>
        ) : null}

        {panel.kind === "connecting" ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-(--surface-nav)/90 text-sm text-white">
            <Spinner className="size-4" />
            Connecting to the video call…
          </div>
        ) : null}
      </div>

      {mintLimitNotice !== undefined ? (
        <Alert
          data-slot="consultation-video-mint-limit-notice"
          className="shrink-0 rounded-2xl border-amber-200 bg-amber-50 text-amber-900"
        >
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Reconnect limit reached</AlertTitle>
          <AlertDescription>
            Your call keeps running. We&apos;ll be able to refresh your connection again in
            about {Math.max(0, mintLimitNotice)} seconds if needed.
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

/**
 * One participant's media tile: a `<video>` element bound to the participant's
 * persistent video track (or an audio-only placeholder), plus a hidden
 * `<audio>` element for the audio track. The local tile's own audio is muted
 * for playback — it is still sent, only not looped back to the local speaker.
 *
 * `variant` only changes chrome (corner rounding, label size) — `"hero"` fills
 * its absolutely-positioned parent edge-to-edge, `"pip"` sits inside the small
 * floating thumbnail and so keeps a rounded, bordered look of its own.
 */
function ParticipantVideoTile({
  tile,
  variant,
}: {
  tile: ParticipantTile;
  variant: "hero" | "pip";
}) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = videoElRef.current;
    if (!el) return;
    const stream = tile.videoTrack ? new MediaStream([tile.videoTrack]) : null;
    el.srcObject = stream;
  }, [tile.videoTrack]);

  useEffect(() => {
    const el = audioElRef.current;
    if (!el || tile.isLocal) return;
    const stream = tile.audioTrack ? new MediaStream([tile.audioTrack]) : null;
    el.srcObject = stream;
  }, [tile.audioTrack, tile.isLocal]);

  return (
    <div
      data-slot="consultation-video-tile"
      data-variant={variant}
      className={
        variant === "hero"
          ? "absolute inset-0 flex items-center justify-center overflow-hidden bg-teal-950/60"
          : "relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-900"
      }
    >
      {tile.videoTrack ? (
        <video
          ref={videoElRef}
          autoPlay
          playsInline
          muted={tile.isLocal}
          className={
            variant === "pip"
              ? "h-full w-full -scale-x-100 object-cover"
              : "h-full w-full object-cover"
          }
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-teal-100/70">
          <VideoOff className={variant === "hero" ? "size-6" : "size-4"} />
          {variant === "hero" ? <span className="text-xs">{tile.label}</span> : null}
        </div>
      )}
      {/* Remote audio is played back through this element; local audio is never
          looped back to the local speaker (avoids local echo). */}
      {!tile.isLocal ? <audio ref={audioElRef} autoPlay /> : null}
      <span
        className={
          variant === "hero"
            ? "absolute top-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md"
            : "absolute bottom-1 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white"
        }
      >
        {variant === "hero" ? (
          <span
            className={`size-1.5 rounded-full ${tile.videoTrack ? "animate-pulse bg-(--surface-nav-accent)" : "bg-amber-400"}`}
          />
        ) : null}
        {tile.label}
      </span>
    </div>
  );
}

/**
 * Pre-join panel shown to both participants before their first join
 * (Requirement 20.11, 22.1): the third-party transport disclosure, a device
 * test, and the join action itself. The disclosure is explicitly
 * informational — it stores no consent, submits no request, and is not
 * represented anywhere as a Consent_Record; joining is a separate, confirmed
 * action rather than something the disclosure itself triggers.
 */
function PreJoinPanel({
  onOpenDeviceTest,
  onOpenJoinConfirm,
  joining,
}: {
  onOpenDeviceTest: () => void;
  onOpenJoinConfirm: () => void;
  joining: boolean;
}) {
  return (
    <section
      data-slot="consultation-video-pre-join"
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-(--surface-card) p-4"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="size-5 shrink-0 text-(--surface-nav)" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Before you join</p>
          <p className="text-xs text-slate-500">
            This call&apos;s audio and video are carried by a third-party video provider,
            not by BayanHealth directly.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenDeviceTest}
          aria-label="Test your camera and microphone"
          className="rounded-xl"
        >
          <Settings2 className="size-3.5" />
          Test camera &amp; microphone
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onOpenJoinConfirm}
          disabled={joining}
          aria-label="Review and confirm joining the video call"
          className="rounded-xl bg-(--surface-nav) text-white hover:bg-(--surface-nav)/90"
        >
          {joining ? (
            <>
              <Spinner className="mr-2 size-3" />
              Joining…
            </>
          ) : (
            "Join meeting"
          )}
        </Button>
      </div>
    </section>
  );
}

/**
 * Confirms the join action before it connects the participant to the call.
 * This is the "button that directs them to the meeting room with a
 * confirmation" step — a plain UI gate, distinct from the third-party
 * transport disclosure on {@link PreJoinPanel}, which is shown regardless of
 * whether this dialog is ever opened.
 */
function JoinConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="consultation-video-join-confirm">
        <DialogHeader>
          <DialogTitle>Join the consultation?</DialogTitle>
          <DialogDescription>
            You&apos;ll connect with your microphone and camera off. You can turn either
            on at any time once you&apos;re in.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            Join now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Lets a participant preview their camera and hear their own microphone level
 * before joining. Entirely local: it opens its own `getUserMedia` stream,
 * never touches the Daily call object or `callRef`, and stops every track it
 * opened as soon as the dialog closes or unmounts so the browser's
 * camera/microphone indicator goes dark again.
 */
function DeviceTestModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterFrameRef = useRef<number | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setMicLevel(0);

    void (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not access your camera or microphone.",
          );
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // A simple level meter, not a codec preview — this only needs to show
      // that the microphone is picking up sound, not what the call will hear.
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const average = data.reduce((sum, value) => sum + value, 0) / data.length;
        setMicLevel(Math.min(1, average / 128));
        meterFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    })();

    return () => {
      cancelled = true;
      if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="consultation-video-device-test" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Test your camera &amp; microphone</DialogTitle>
          <DialogDescription>
            Check that the call can see and hear you before you join.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive" className="rounded-xl border-rose-200 bg-rose-50">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-teal-950/80">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-center gap-2">
              <Mic className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
              <div
                role="meter"
                aria-label="Microphone level"
                aria-valuenow={Math.round(micLevel * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full rounded-full bg-(--surface-nav-accent) transition-[width]"
                  style={{ width: `${Math.round(micLevel * 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">Speak normally — the bar above should move.</p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `VIDEO_PROVIDER_UNAVAILABLE` / `VIDEO_DISABLED` — chat-only (Requirement 20.5). */
function ChatOnlyPanel({ reason }: { reason: "provider-unavailable" | "video-disabled" }) {
  return (
    <section
      data-slot="consultation-video-chat-only"
      className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4"
    >
      <MessagesSquare className="size-5 shrink-0 text-slate-400" />
      <div>
        <p className="text-sm font-semibold text-slate-900">Video isn&apos;t available right now</p>
        <p className="text-xs text-slate-500">
          {reason === "provider-unavailable"
            ? "The video provider is temporarily unavailable. "
            : "Video isn't enabled for this environment. "}
          You can keep talking in chat below.
        </p>
      </div>
    </section>
  );
}

/** `429 VIDEO_CREDENTIAL_MINT_LIMIT` while not connected (Requirement 20.14). */
function ChatAvailablePanel({ retryAfterSeconds }: { retryAfterSeconds?: number }) {
  return (
    <section
      data-slot="consultation-video-chat-available"
      className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4"
    >
      <MessagesSquare className="size-5 shrink-0 text-slate-400" />
      <div>
        <p className="text-sm font-semibold text-slate-900">Video call limit reached</p>
        <p className="text-xs text-slate-500">
          You can keep talking in chat now.
          {retryAfterSeconds !== undefined
            ? ` The video call will be available again in about ${retryAfterSeconds} seconds.`
            : ""}
        </p>
      </div>
    </section>
  );
}
