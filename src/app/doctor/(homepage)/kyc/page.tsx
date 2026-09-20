import { redirect } from "next/navigation";

/**
 * `/doctor/kyc` is now `/doctor/profile`.
 *
 * Credentialing became one section of the doctor's own profile rather than a
 * page of its own, so this route survives only to keep existing links,
 * bookmarks, and any emailed "complete your verification" prompt working. A
 * permanent redirect rather than a duplicate page: two routes rendering the same
 * surface is how the two drift apart.
 */
export default function Page() {
  redirect("/doctor/profile");
}
