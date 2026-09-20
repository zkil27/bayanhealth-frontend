"use client";

import { FitForWork } from "./services/FitForWork";
import { FitForSchool } from "./services/FitForSchool";
import { FitForClimb } from "./services/FitForClimb";
import { FitForTravel } from "./services/FitForTravel";
import { SickLeave } from "./services/SickLeave";
import { Teleconsult } from "./services/Teleconsult";
import { DynamicIntakeFormValues } from "@/features/booking/schemas/intakeSchema";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { SERVICES } from "@/features/booking/constants/bookingConstants";

type ServiceType =
  | "fit-for-work"
  | "fit-for-school"
  | "fit-for-climb"
  | "fit-for-travel"
  | "sick-leave"
  | "teleconsult";

const SERVICE_COMPONENTS: Record<
  ServiceType,
  React.ComponentType<{ readOnly?: boolean }>
> = {
  "fit-for-work": FitForWork,
  "fit-for-school": FitForSchool,
  "fit-for-climb": FitForClimb,
  "fit-for-travel": FitForTravel,
  "sick-leave": SickLeave,
  teleconsult: Teleconsult,
};

interface ServiceRequestSectionProps {
  serviceType: ServiceType;
  readOnly?: boolean;
}

export function ServiceRequestSection({
  serviceType,
  readOnly = false,
}: ServiceRequestSectionProps) {
  const ServiceComponent = SERVICE_COMPONENTS[serviceType];

  if (!ServiceComponent) {
    console.error(`Unknown service type: ${serviceType}`);
    return (
      <div className="text-red-500">
        Error: Unknown service type {"{serviceType}"}
      </div>
    );
  }

  return <ServiceComponent readOnly={readOnly} />;
}

const SERVICE_TYPE_LABELS = SERVICES.reduce<Record<string, string>>(
  (acc, service) => {
    if (service.value) {
      acc[service.value] = service.label;
    }
    return acc;
  },
  {},
);

const EXCLUDE_FIELDS = ["type"];

const formatFieldName = (key: string) => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null || value === "")
    return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "None";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

interface ReadOnlyServiceRequestSectionProps {
  data: DynamicIntakeFormValues["requestDetails"];
  serviceType: ServiceType;
}

export function ReadOnlyServiceRequestSection({
  data,
  serviceType,
}: ReadOnlyServiceRequestSectionProps) {
  const displayFields = useMemo(() => {
    if (!data) return [];

    return Object.entries(data)
      .filter(([key]) => !EXCLUDE_FIELDS.includes(key))
      .map(([key, value]) => ({
        key,
        label: formatFieldName(key),
        value: formatValue(value),
      }));
  }, [data]);

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No service request data
      </p>
    );
  }

  const serviceTypeLabel =
    SERVICE_TYPE_LABELS[serviceType] || serviceType.replace(/-/g, " ");
  const badgeLabel = serviceType.replace(/-/g, " ");

  const halfLength = Math.ceil(displayFields.length / 2);
  const leftColumnFields = displayFields.slice(0, halfLength);
  const rightColumnFields = displayFields.slice(halfLength);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-xl font-bold text-foreground">
            {serviceTypeLabel}
          </h3>
          <p className="text-xs text-muted-foreground">
            Service Request Details
          </p>
        </div>
        <Badge className="inline-flex self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize sm:self-center">
          {badgeLabel}
        </Badge>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div className="space-y-3">
          {leftColumnFields.map((field) => (
            <div
              key={field.key}
              className="flex justify-between border-b border-border py-1.5 text-sm"
            >
              <span className="text-muted-foreground">{field.label}</span>
              <span className="font-medium text-foreground">{field.value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {rightColumnFields.map((field) => (
            <div
              key={field.key}
              className="flex justify-between border-b border-border py-1.5 text-sm"
            >
              <span className="text-muted-foreground">{field.label}</span>
              <span className="font-medium text-foreground">{field.value}</span>
            </div>
          ))}
        </div>
      </div>

      {serviceType === "fit-for-travel" && data.type === "fit-for-travel" && (
        <div className="mt-4 rounded-lg bg-blue-50/70 p-4">
          <h4 className="text-sm font-semibold text-foreground">
            Travel Requirements
          </h4>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Vaccine Verification:</span>
              <span className="ml-2 font-medium">
                {data.requiresVaccineVerification
                  ? "✅ Required"
                  : "❌ Not Required"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Medication Supply:</span>
              <span className="ml-2 font-medium">
                {data.medicationSupplyConfirmed
                  ? "✅ Confirmed"
                  : "❌ Not Confirmed"}
              </span>
            </div>
          </div>
        </div>
      )}

      {serviceType === "sick-leave" && data.type === "sick-leave" && (
        <div className="mt-4 rounded-lg bg-amber-50/70 p-4">
          <h4 className="text-sm font-semibold text-foreground">
            Sick Leave Details
          </h4>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Unable to Work:</span>
              <span className="ml-2 font-medium">
                {data.unableToWork ? "✅ Yes" : "❌ No"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Food Handler:</span>
              <span className="ml-2 font-medium">
                {data.isFoodHandler ? "✅ Yes" : "❌ No"}
              </span>
            </div>
          </div>
        </div>
      )}

      {serviceType === "fit-for-climb" && data.type === "fit-for-climb" && (
        <div className="mt-4 rounded-lg bg-emerald-50/70 p-4">
          <h4 className="text-sm font-semibold text-foreground">Climb Details</h4>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Altitude History:</span>
              <span className="ml-2 font-medium">
                {data.hasAltitudeHistory ? "✅ Has History" : "❌ No History"}
              </span>
            </div>
            {data.peakElevation && (
              <div>
                <span className="text-muted-foreground">Peak Elevation:</span>
                <span className="ml-2 font-medium">
                  {data.peakElevation} ft
                </span>
              </div>
            )}
          </div>
          {data.cardiacHistoryNotes && (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Cardiac Notes:</span>
              <p className="mt-1 text-foreground">{data.cardiacHistoryNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
