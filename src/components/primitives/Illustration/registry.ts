/**
 * Generated from docs/illustrations/manifest.json. Only assets that exist in
 * public/illustrations are registered, so a missing file is a type error.
 */
export const ILLUSTRATIONS = {
  "patient/home-welcome": { width: 448, height: 339, onDark: false },
  "patient/finding-doctor": { width: 448, height: 359, onDark: false },
  "patient/doctor-matched": { width: 1200, height: 972, onDark: false },
  "patient/booking-confirmed": { width: 448, height: 358, onDark: false },
  "patient/consult-complete": { width: 448, height: 374, onDark: false },
  "patient/consult-now": { width: 288, height: 308, onDark: false },
  "patient/book-later": { width: 288, height: 262, onDark: false },
  "patient/no-bookings": { width: 288, height: 187, onDark: false },
  "patient/no-records": { width: 288, height: 288, onDark: false },
  "patient/no-medicines": { width: 288, height: 204, onDark: false },
  "patient/care-plan-pending": { width: 192, height: 205, onDark: false },
  "patient/no-doctors": { width: 288, height: 288, onDark: false },
  "patient/no-articles": { width: 192, height: 172, onDark: false },
  "doctor/standby-on-duty": { width: 192, height: 178, onDark: false },
  "doctor/standby-offline": { width: 192, height: 134, onDark: false },
  "doctor/all-clear": { width: 192, height: 133, onDark: false },
  "doctor/day-open": { width: 192, height: 137, onDark: false },
  "doctor/moonlight": { width: 288, height: 267, onDark: false },
  "doctor/kyc-under-review": { width: 288, height: 209, onDark: false },
  "doctor/kyc-upload": { width: 192, height: 196, onDark: false },
  "doctor/no-history": { width: 288, height: 299, onDark: false },
  "doctor/no-documents": { width: 192, height: 133, onDark: false },
  "shared/no-conversations": { width: 288, height: 271, onDark: false },
  "shared/video-waiting": { width: 288, height: 161, onDark: true },
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;
