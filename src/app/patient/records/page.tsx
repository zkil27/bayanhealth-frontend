import { redirect } from "next/navigation";

/**
 * `/patient/records` is now `/patient/health`.
 *
 * The Health tab (Figma S2) merged this bookings-only list with the chart
 * timeline that lived at `/patient/chart` — one screen, three tabs. This
 * redirect is kept rather than deleted because the route was linked from the
 * home consultations rail ("See all"), the services grid, the nav and the
 * booking detail's back control, and patients may have it bookmarked.
 */
export default function Page() {
  redirect("/patient/health");
}
