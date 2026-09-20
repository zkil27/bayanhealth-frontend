import { redirect } from "next/navigation";

/**
 * `/patient/chart` is now `/patient/health?tab=records&filter=documents`.
 *
 * This page rendered a heading of "My Health" over the chart timeline while
 * `/patient/records` rendered the booking lists under a different heading, and
 * the nav linked only the latter — two screens answering one question, one of
 * them unreachable from the nav. The Health tab (Figma S2) merged them; the
 * chart's `document` entries are one Records filter chip away (the
 * `lab_result` entries this page also used to show now have their own "Labs"
 * chip, split out because they are a different thing).
 */
export default function Page() {
  redirect("/patient/health?tab=records&filter=documents");
}
