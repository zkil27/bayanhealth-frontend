"use client";

import * as React from "react";
import { toast } from "sonner";

import { AsyncView } from "@/components/async-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  fetchPlatformSettings,
  updatePlatformSettings,
  type PlatformSettings,
  type PlatformSettingsUpdate,
} from "@/features/admin/lib/api/adminData";

/**
 * Admin platform settings (`/admin/settings`, design A5).
 *
 * Reads `GET /v1/admin/settings` through {@link AsyncView} and writes changes
 * back through `PUT /v1/admin/settings`. The write is a *partial* update per the
 * contract, so only the fields the operator actually changed are sent — that
 * keeps two admins editing different settings from overwriting each other, and
 * makes the audit record say what was changed rather than "everything".
 *
 * Settings are a singleton, so a concurrent edit is a real possibility: the
 * backend answers `409` and this page surfaces that as "someone else changed
 * this" with a reload, rather than retrying over the other admin's change.
 */

/** Bounds from the contract (`PlatformSettingsUpdateRequest`). */
const INTAKE_REMINDER_MIN = 1;
const INTAKE_REMINDER_MAX = 1440;

interface SettingsDraft {
  maintenanceMode: boolean;
  notificationsEnabled: boolean;
  /** Held in major units (what the operator types), converted to cents on save. */
  defaultConsultationAmount: string;
  defaultCurrency: string;
  intakeReminderMinutes: string;
}

function toDraft(settings: PlatformSettings): SettingsDraft {
  return {
    maintenanceMode: settings.maintenanceMode,
    notificationsEnabled: settings.notificationsEnabled,
    defaultConsultationAmount: (
      settings.defaultConsultationAmountCents / 100
    ).toFixed(2),
    defaultCurrency: settings.defaultCurrency,
    intakeReminderMinutes: String(settings.intakeReminderMinutes),
  };
}

/** Major-unit amount → integer minor units, or `null` when not a valid amount. */
function toCents(value: string): number | null {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function toMinutes(value: string): number | null {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed)) return null;
  if (parsed < INTAKE_REMINDER_MIN || parsed > INTAKE_REMINDER_MAX) return null;
  return parsed;
}

/**
 * The subset of `draft` that differs from `settings`, or `null` when a field is
 * invalid. An empty object means "nothing to save".
 */
function diff(
  settings: PlatformSettings,
  draft: SettingsDraft,
): PlatformSettingsUpdate | null {
  const cents = toCents(draft.defaultConsultationAmount);
  const minutes = toMinutes(draft.intakeReminderMinutes);
  const currency = draft.defaultCurrency.trim().toUpperCase();
  if (cents === null || minutes === null || currency.length !== 3) return null;

  const patch: PlatformSettingsUpdate = {};
  if (draft.maintenanceMode !== settings.maintenanceMode) {
    patch.maintenanceMode = draft.maintenanceMode;
  }
  if (draft.notificationsEnabled !== settings.notificationsEnabled) {
    patch.notificationsEnabled = draft.notificationsEnabled;
  }
  if (cents !== settings.defaultConsultationAmountCents) {
    patch.defaultConsultationAmountCents = cents;
  }
  if (currency !== settings.defaultCurrency) {
    patch.defaultCurrency = currency;
  }
  if (minutes !== settings.intakeReminderMinutes) {
    patch.intakeReminderMinutes = minutes;
  }
  return patch;
}

function formatTimestamp(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminSettingsPage() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Platform settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide defaults and feature availability.
        </p>
      </div>

      <AsyncView<PlatformSettings>
        fetcher={() => fetchPlatformSettings(idToken ?? "")}
        deps={[idToken]}
      >
        {(settings) => (
          // Keyed on the server's own version marker so a reload after a
          // concurrent edit rebuilds the form from the new truth rather than
          // leaving a stale draft on screen.
          <SettingsForm key={settings.updatedAt} initial={settings} />
        )}
      </AsyncView>
    </section>
  );
}

function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const [saved, setSaved] = React.useState<PlatformSettings>(initial);
  const [draft, setDraft] = React.useState<SettingsDraft>(() => toDraft(initial));
  const [isSaving, setIsSaving] = React.useState(false);

  const patch = diff(saved, draft);
  const isValid = patch !== null;
  const isDirty = patch !== null && Object.keys(patch).length > 0;

  function set<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patch || Object.keys(patch).length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      const next = await updatePlatformSettings(idToken ?? "", patch);
      setSaved(next);
      setDraft(toDraft(next));
      toast.success("Platform settings saved.");
    } catch (error) {
      const conflict = error instanceof ApiError && error.status === 409;
      toast.error(
        conflict
          ? "Someone else changed these settings. Reload to see the current values before saving again."
          : error instanceof ApiError
            ? error.message
            : "Could not save platform settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      data-slot="admin-settings"
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Consultations</CardTitle>
          <CardDescription>
            Defaults applied to bookings and consultation sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultConsultationAmount">
              Default consultation amount
            </Label>
            <Input
              id="defaultConsultationAmount"
              inputMode="decimal"
              value={draft.defaultConsultationAmount}
              aria-invalid={toCents(draft.defaultConsultationAmount) === null}
              onChange={(e) =>
                set("defaultConsultationAmount", e.target.value)
              }
            />
            <span className="text-xs text-muted-foreground">
              In {saved.defaultCurrency}, e.g. 500.00
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultCurrency">Default currency</Label>
            <Input
              id="defaultCurrency"
              maxLength={3}
              value={draft.defaultCurrency}
              aria-invalid={draft.defaultCurrency.trim().length !== 3}
              onChange={(e) =>
                set("defaultCurrency", e.target.value.toUpperCase())
              }
            />
            <span className="text-xs text-muted-foreground">
              Three-letter ISO 4217 code
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="intakeReminderMinutes">
              Intake reminder (minutes)
            </Label>
            <Input
              id="intakeReminderMinutes"
              inputMode="numeric"
              value={draft.intakeReminderMinutes}
              aria-invalid={toMinutes(draft.intakeReminderMinutes) === null}
              onChange={(e) => set("intakeReminderMinutes", e.target.value)}
            />
            <span className="text-xs text-muted-foreground">
              Between {INTAKE_REMINDER_MIN} and {INTAKE_REMINDER_MAX}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature toggles</CardTitle>
          <CardDescription>
            Platform-wide capabilities currently in effect.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          <ToggleRow
            id="maintenanceMode"
            label="Maintenance mode"
            description="Show a maintenance banner and pause new bookings platform-wide."
            checked={draft.maintenanceMode}
            onChange={(v) => set("maintenanceMode", v)}
          />
          <ToggleRow
            id="notificationsEnabled"
            label="Notifications"
            description="Dispatch email and SMS notifications to users."
            checked={draft.notificationsEnabled}
            onChange={(v) => set("notificationsEnabled", v)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!isDirty || !isValid || isSaving}>
          {isSaving && <Spinner className="h-4 w-4" />}
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            disabled={isSaving}
            onClick={() => setDraft(toDraft(saved))}
          >
            Discard
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Last updated {formatTimestamp(saved.updatedAt)} by{" "}
          {saved.updatedBy || "system"}.
        </p>
      </div>
    </form>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-col">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* Text alongside the switch: state is never carried by position alone. */}
        <span className="text-xs text-muted-foreground">
          {checked ? "Enabled" : "Disabled"}
        </span>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}
