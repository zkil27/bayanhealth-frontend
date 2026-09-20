import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import {
  ConsentSheet,
  EmergencyEscalationSheet,
  HealthTimelineScreen,
  MyHealthScreen,
  NoAreaAssignedScreen,
  PatientHomeScreen,
  ProfileScreen,
  ReceiptReceivedSheet,
  RescheduleSheet,
  RolePickerScreen,
  SignInScreen,
  VerifyPrescriptionScreen,
} from "@/features/patient/components/redesign";

export const metadata: Metadata = {
  title: "Patient redesign preview — BayanHealth",
};

/**
 * Gallery of the Figma "hardog" patient redesign. Each frame is a faithful,
 * presentational build against the brand tokens; wire-up into the live routes
 * (`/patient`, `/patient/profile`, `/(auth)/*`, `/no-access`, prescription verify) is a
 * follow-up. Not linked from app navigation — reach it directly at `/redesign`.
 */
export default function RedesignPreviewPage() {
  // Design scaffolding only — never exposed in the production build.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen w-full bg-(--surface-sunken) px-4 py-10 text-(--text-body) sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold text-(--text-heading)">
            Patient redesign — Figma preview
          </h1>
          <p className="mt-2 max-w-2xl text-(--text-muted)">
            Faithful builds of the Tagalog patient flow (S1–S5, M1–M4, P1–P2,
            Y1) using the BayanHealth brand tokens. Presentational only — no data
            or navigation is wired yet.
          </p>
        </header>

        <Group title="Core screens">
          <Frame label="S1 · Patient home">
            <PatientHomeScreen />
          </Frame>
          <Frame label="S2 · My Health">
            <MyHealthScreen />
          </Frame>
          <Frame label="S3 · Profile & settings">
            <ProfileScreen />
          </Frame>
          <Frame label="S4 · Sign in">
            <SignInScreen />
          </Frame>
          <Frame label="S5 · Sign-up role picker">
            <RolePickerScreen />
          </Frame>
        </Group>

        <Group title="Bottom sheets">
          <Frame label="M1 · Consent">
            <SheetStage>
              <ConsentSheet />
            </SheetStage>
          </Frame>
          <Frame label="M2 · Reschedule / cancel">
            <SheetStage>
              <RescheduleSheet />
            </SheetStage>
          </Frame>
          <Frame label="M3 · Emergency escalation">
            <SheetStage>
              <EmergencyEscalationSheet />
            </SheetStage>
          </Frame>
          <Frame label="M4 · Receipt received">
            <SheetStage>
              <ReceiptReceivedSheet />
            </SheetStage>
          </Frame>
        </Group>

        <Group title="Records & access">
          <Frame label="P1 · Health timeline">
            <HealthTimelineScreen />
          </Frame>
          <Frame label="P2 · Verify a prescription">
            <VerifyPrescriptionScreen />
          </Frame>
          <Frame label="Y1 · No area assigned">
            <NoAreaAssignedScreen />
          </Frame>
        </Group>
      </div>
    </main>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-sm font-bold tracking-[0.08em] text-(--text-subtle) uppercase">
        {title}
      </h2>
      <div className="flex flex-wrap gap-8">{children}</div>
    </section>
  );
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-3">
      {children}
      <figcaption className="text-[13px] font-medium text-(--text-muted)">
        {label}
      </figcaption>
    </figure>
  );
}

/** Docks a bottom sheet to the base of a dimmed device-sized stage. */
function SheetStage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[640px] w-[360px] flex-col justify-end overflow-hidden rounded-[22px] border border-(--border-default) bg-black/40">
      {children}
    </div>
  );
}
