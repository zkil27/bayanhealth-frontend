"use client";

/**
 * Active Consultation Local Storage Helper.
 *
 * Tracks the patient's in-flight / unfinished consultation session so that
 * if the user accidentally navigates back, refreshes the browser, or returns
 * to the home screen, the application can immediately offer a seamless
 * 1-tap "Resume Consultation" action without waiting for network query
 * waterfalls or falling back to a generic empty state.
 */

export type ActiveConsultStage = "room" | "waiting_queue" | "intake" | "payment";

export interface ActiveConsultationRef {
  bookingId: string;
  status?: string;
  doctorName?: string;
  serviceType?: string;
  stage: ActiveConsultStage;
  startedAt?: string;
  updatedAt: number;
}

const STORAGE_KEY = "bayanhealth_active_consultation_v1";
/** 4 hours session window before an abandoned consult is considered expired. */
const EXPIRATION_WINDOW_MS = 4 * 60 * 60 * 1000;

export function setActiveConsultation(
  ref: Omit<ActiveConsultationRef, "updatedAt"> & { updatedAt?: number },
): void {
  if (typeof window === "undefined") return;
  try {
    const data: ActiveConsultationRef = {
      ...ref,
      updatedAt: ref.updatedAt ?? Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Dispatch custom event so concurrent components (like PatientShell header) react immediately
    window.dispatchEvent(new CustomEvent("bayanhealth:active-consultation-change", { detail: data }));
  } catch {
    // Graceful fallback for storage quota or privacy mode restrictions
  }
}

export function getActiveConsultation(): ActiveConsultationRef | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: ActiveConsultationRef = JSON.parse(raw);
    if (!parsed || !parsed.bookingId) return null;

    if (Date.now() - parsed.updatedAt > EXPIRATION_WINDOW_MS) {
      clearActiveConsultation();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveConsultation(targetBookingId?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (targetBookingId) {
      const active = getActiveConsultation();
      if (active && active.bookingId !== targetBookingId) {
        return;
      }
    }
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("bayanhealth:active-consultation-change", { detail: null }));
  } catch {
    // Graceful fallback
  }
}
