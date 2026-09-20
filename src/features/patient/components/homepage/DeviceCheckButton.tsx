"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, Mic, TriangleAlert, Video } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Pre-call camera and microphone check.
 *
 * Entirely local: it asks the browser for the two tracks the consultation needs
 * and stops them again immediately. No provider SDK, no room, no network — so
 * it works before a consultation exists and cannot consume a join credential.
 * The point is to surface a denied permission or a missing device *now*, rather
 * than in the first thirty seconds of a consultation the patient paid for.
 *
 * Tracks are always stopped, including on unmount mid-request, because a
 * forgotten `getUserMedia` stream leaves the camera light on.
 */

type CheckState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; camera: boolean; microphone: boolean }
  | { kind: "denied" }
  | { kind: "unavailable"; message: string };

export function DeviceCheckButton({ className }: { className?: string }) {
  const [state, setState] = useState<CheckState>({ kind: "idle" });
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  const run = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState({
        kind: "unavailable",
        message: "This browser cannot access a camera or microphone.",
      });
      return;
    }

    setState({ kind: "checking" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      const camera = stream.getVideoTracks().length > 0;
      const microphone = stream.getAudioTracks().length > 0;
      // Release the devices the moment the answer is known.
      stopStream();
      setState({ kind: "ok", camera, microphone });
    } catch (error) {
      stopStream();
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setState({ kind: "denied" });
        return;
      }
      setState({
        kind: "unavailable",
        message:
          name === "NotFoundError"
            ? "No camera or microphone was found on this device."
            : "We could not reach your camera and microphone.",
      });
    }
  }, [stopStream]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => void run()}
        disabled={state.kind === "checking"}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-(--radius-pill) border border-(--border-default) bg-(--surface-card) px-4 text-[14.5px] font-semibold text-(--text-body) transition-colors hover:bg-(--action-secondary-hover-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-60 sm:w-auto"
      >
        <Video className="size-4" />
        {state.kind === "checking" ? "Checking…" : "Test camera & audio"}
      </button>

      <DeviceCheckResult state={state} />
    </div>
  );
}

function DeviceCheckResult({ state }: { state: CheckState }) {
  if (state.kind === "idle" || state.kind === "checking") return null;

  if (state.kind === "ok" && state.camera && state.microphone) {
    return (
      <p
        data-slot="device-check-result"
        data-result="ok"
        className="flex items-center gap-1.5 text-[13.5px] font-semibold text-(--status-available-fg)"
      >
        <CircleCheck className="size-3.5 shrink-0" />
        Camera and microphone are working.
      </p>
    );
  }

  if (state.kind === "ok") {
    // One of the two is missing — say which, since the fix differs.
    return (
      <p
        data-slot="device-check-result"
        data-result="partial"
        className="flex items-center gap-1.5 text-[13.5px] font-semibold text-(--status-soon-fg)"
      >
        {state.camera ? (
          <Mic className="size-3.5 shrink-0" />
        ) : (
          <Video className="size-3.5 shrink-0" />
        )}
        {state.camera
          ? "Camera works, but no microphone was found."
          : "Microphone works, but no camera was found."}{" "}
        You can still consult by chat.
      </p>
    );
  }

  return (
    <p
      data-slot="device-check-result"
      data-result={state.kind}
      className="flex items-start gap-1.5 text-[13.5px] text-(--danger-fg)"
    >
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      {state.kind === "denied"
        ? "Access was blocked. Allow camera and microphone for this site in your browser settings, then try again."
        : state.message}
    </p>
  );
}
