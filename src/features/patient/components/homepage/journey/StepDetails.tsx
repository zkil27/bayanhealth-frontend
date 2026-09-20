import type { JourneyDetails, JourneyStepStatus } from "@/lib/patient/careJourney";

/**
 * The body of a step's popover (desktop) or expanded row (mobile).
 *
 * Renders only the `details` it is handed. It never looks a step up by index
 * or reaches for a raw record, so the popover on node 2 cannot show node 3.
 */
export function StepDetails({
  details,
  status,
}: {
  details: JourneyDetails;
  status: JourneyStepStatus;
}) {
  switch (details.kind) {
    case "explainer":
      return (
        <p className="text-[12.5px] text-(--text-muted)">
          {status === "locked" ? (
            <span className="mr-1 font-semibold text-(--text-heading)">Coming up:</span>
          ) : null}
          {details.text}
        </p>
      );
    case "intake":
      return (
        <div className="space-y-1.5 text-[12.5px] text-(--text-muted)">
          <p>
            <span className="font-semibold text-(--text-heading)">What you shared:</span>{" "}
            {details.chiefComplaint ?? "Nothing recorded here yet."}
          </p>
          {details.submittedAt ? <p>Submitted {formatDateTime(details.submittedAt)}</p> : null}
          {details.acknowledgedAt ? (
            <p>Read by your doctor {formatDateTime(details.acknowledgedAt)}</p>
          ) : null}
        </div>
      );
    case "consultation":
      return (
        <div className="space-y-1 text-[12.5px] text-(--text-muted)">
          <p className="font-semibold text-(--text-heading)">
            {details.doctorName ?? "Your doctor"}
          </p>
          <p>{["PRC-verified physician", details.department].filter(Boolean).join(" · ")}</p>
          {details.scheduledAt ? <p>{formatDateTime(details.scheduledAt)}</p> : null}
        </div>
      );
    case "documents":
      if (details.medications.length === 0 && !details.releasedAt) {
        return (
          <p className="text-[12.5px] text-(--text-muted)">Nothing has been released yet.</p>
        );
      }
      return (
        <div className="space-y-2 text-[12.5px] text-(--text-muted)">
          {details.medications.length > 0 ? (
            <ul className="space-y-1">
              {details.medications.map((medication) => (
                <li key={`${medication.name}-${medication.dose}-${medication.frequency}`}>
                  <span className="font-semibold text-(--text-heading)">
                    {medication.name} {medication.dose}
                  </span>
                  {medication.frequency ? ` · ${medication.frequency}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {details.instructions ? <p>{details.instructions}</p> : null}
          {details.releasedAt ? <p>Released {formatDateTime(details.releasedAt)}</p> : null}
        </div>
      );
    case "follow-up":
      return details.targetDate ? (
        <div className="space-y-1 text-[12.5px] text-(--text-muted)">
          <p className="font-semibold text-(--text-heading)">Follow-up scheduled</p>
          <p>On or before {formatDateTime(details.targetDate)}</p>
          {details.reason ? <p>{details.reason}</p> : null}
        </div>
      ) : (
        <p className="text-[12.5px] text-(--text-muted)">No follow-up date has been set.</p>
      );
  }
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    ...(value.includes("T") ? { timeStyle: "short" as const } : {}),
  }).format(date);
}
