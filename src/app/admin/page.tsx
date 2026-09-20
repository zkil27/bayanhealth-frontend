"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Stethoscope,
  TriangleAlert,
  UserX,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  fetchAdminBookingsByStatus,
  fetchKycApplications,
  type AdminBooking,
  type KycApplication,
} from "@/features/admin/lib/api/adminData";
import {
  countConsultsToday,
  relativeTime,
  selectUrgentCases,
  type UrgentCase,
  type UrgentCategory,
} from "@/features/admin/lib/urgentCases";

/**
 * Admin overview (root `/admin`, design A1).
 *
 * Leads with the triage queue rather than with counts: the panel answers "what
 * needs a human right now", and the stat cards sit under it as context. Every
 * figure is derived from the contract-frozen admin endpoints through
 * {@link AsyncView}, which standardises loading / data / empty / error
 * (Requirements 13.x) — no mock data backs this page.
 *
 * The booking queue endpoint is per-status (`GET /v1/admin/bookings?status=`),
 * so the four statuses an operator can still act on are fetched in parallel and
 * classified client-side by `selectUrgentCases`.
 */

interface AdminOverviewData {
  applications: KycApplication[];
  bookings: AdminBooking[];
}

/**
 * The booking statuses worth loading for triage.
 *
 * `pending_payment` is excluded — a patient who has not paid yet is waiting on
 * themselves, not on an operator. `cancelled` is terminal. `completed` is loaded
 * only so "consults today" can report what has already finished.
 */
const TRIAGE_STATUSES = [
  "payment_submitted",
  "confirmed",
  "in_progress",
  "completed",
] as const;

async function fetchAdminOverview(token: string): Promise<AdminOverviewData> {
  const [applications, ...pages] = await Promise.all([
    fetchKycApplications(token),
    ...TRIAGE_STATUSES.map((status) =>
      fetchAdminBookingsByStatus(token, status),
    ),
  ]);
  return { applications, bookings: pages.flat() };
}

interface OverviewStat {
  label: string;
  value: string;
  icon: LucideIcon;
  hint: string;
}

function deriveStats(
  { applications }: AdminOverviewData,
  urgent: UrgentCase[],
  today: { completed: number; booked: number; total: number },
): OverviewStat[] {
  const verifiedDoctors = applications.filter(
    (a) => a.verificationStatus === "approved",
  ).length;
  const pendingKyc = applications.filter(
    (a) => a.verificationStatus === "pending",
  ).length;

  return [
    {
      label: "Urgent cases",
      value: urgent.length.toLocaleString(),
      icon: TriangleAlert,
      hint: urgent.length > 0 ? "Needs action now" : "Queue is clear",
    },
    {
      label: "Pending KYC",
      value: pendingKyc.toLocaleString(),
      icon: ClipboardList,
      hint: "Awaiting review",
    },
    {
      label: "Verified doctors",
      value: verifiedDoctors.toLocaleString(),
      icon: Stethoscope,
      hint: "Approved credentialing",
    },
    {
      label: "Consults today",
      value: today.total.toLocaleString(),
      icon: CheckCircle2,
      hint: `${today.completed} completed · ${today.booked} booked`,
    },
  ];
}

/** Icon per triage category, so status is never carried by colour alone. */
const CATEGORY_ICON: Record<UrgentCategory, LucideIcon> = {
  escalated: AlertTriangle,
  payment: Wallet,
  unassigned: UserX,
};

const CATEGORY_VARIANT: Record<
  UrgentCategory,
  "destructive" | "secondary" | "outline"
> = {
  escalated: "destructive",
  payment: "secondary",
  unassigned: "outline",
};

function formatAmount(cents?: number, currency?: string): string | null {
  if (cents === undefined || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function submittedTime(value?: string): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function recentApplications(applications: KycApplication[]): KycApplication[] {
  return [...applications]
    .sort((a, b) => submittedTime(b.submittedAt) - submittedTime(a.submittedAt))
    .slice(0, 4);
}

export default function AdminOverviewPage() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Urgent cases first, then the platform snapshot and the review queue.
        </p>
      </div>

      <AsyncView<AdminOverviewData>
        fetcher={() => fetchAdminOverview(idToken ?? "")}
        deps={[idToken]}
      >
        {(data) => {
          const urgent = selectUrgentCases(data.bookings);
          const today = countConsultsToday(data.bookings);
          const stats = deriveStats(data, urgent, today);
          const recent = recentApplications(data.applications);

          return (
            <div className="flex w-full flex-col gap-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map(({ label, value, icon: Icon, hint }) => (
                  <Card key={label}>
                    <CardHeader>
                      <CardDescription>{label}</CardDescription>
                      <CardTitle className="text-2xl">{value}</CardTitle>
                      <CardContent className="flex items-center gap-2 px-0 pt-1 text-xs text-muted-foreground">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{hint}</span>
                      </CardContent>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
                <UrgentCasesPanel cases={urgent} />
                <RecentKycCard applications={recent} />
              </div>
            </div>
          );
        }}
      </AsyncView>
    </section>
  );
}

function UrgentCasesPanel({ cases }: { cases: UrgentCase[] }) {
  return (
    <Card data-slot="admin-urgent-cases">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Urgent cases</CardTitle>
            <CardDescription>
              Escalations and blocked consults that need a human today.
            </CardDescription>
          </div>
          <Badge variant={cases.length > 0 ? "destructive" : "secondary"}>
            {cases.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {cases.length > 0 ? (
          cases.map((item) => <UrgentCaseRow key={item.booking.bookingId} item={item} />)
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            Nothing is blocked right now — no escalated intakes, unverified
            payments, or unassigned consults.
          </p>
        )}
        <p className="pt-1 text-xs text-muted-foreground">
          Status is always text plus icon — never colour alone.
        </p>
      </CardContent>
    </Card>
  );
}

function UrgentCaseRow({ item }: { item: UrgentCase }) {
  const { booking, category, label, title } = item;
  const Icon = CATEGORY_ICON[category];
  const amount = formatAmount(booking.amountCents, booking.currency);

  // Every fragment below is a real field on the booking. The booking queue
  // carries ids, not patient or doctor names, so the row identifies the case by
  // its booking id rather than inventing a person's name for it.
  const details = [
    booking.bookingId,
    amount,
    `consult ${relativeTime(booking.scheduledAt)}`,
    booking.doctorId ? null : "no doctor assigned",
  ].filter(Boolean);

  return (
    <div
      data-slot="admin-urgent-case"
      className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <Badge variant={CATEGORY_VARIANT[category]} className="w-fit gap-1">
          <Icon className="h-3 w-3 shrink-0" />
          {label}
        </Badge>
        <span className="text-sm font-medium">{title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {details.join(" · ")}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        render={
          <Link href={`/admin/bookings/${encodeURIComponent(booking.bookingId)}`}>
            Open
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
    </div>
  );
}

function RecentKycCard({ applications }: { applications: KycApplication[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent KYC applications</CardTitle>
        <CardDescription>
          The most recent doctor credentialing submissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {applications.length > 0 ? (
          applications.map((app) => (
            <div
              key={app.doctorId}
              className="flex items-center justify-between gap-3 py-3 first:pt-0"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {app.fullName || app.email}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {app.specialty || "—"} · License {app.licenseNumber || "—"}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(app.submittedAt)}
              </span>
            </div>
          ))
        ) : (
          <p className="py-3 text-sm text-muted-foreground first:pt-0">
            No KYC applications have been submitted yet.
          </p>
        )}
        <Link
          href="/admin/kyc"
          className="pt-3 text-sm font-medium text-primary hover:underline"
        >
          View KYC supervision queue
        </Link>
      </CardContent>
    </Card>
  );
}
