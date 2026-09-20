"use client";

import {
  AlertCircle,
  Calendar,
  MapPin,
  Clock,
  Activity,
  Zap,
  Pill,
  Briefcase,
} from "lucide-react";

interface CheckupSectionProps {
  data?: any;
  onChange: (data: any) => void;
}

export function CheckupSection({ data, onChange }: CheckupSectionProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Chief Complaint */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-red-500" />
            <span>Chief Complaint</span>
            <span className="text-xs text-red-500">*</span>
          </div>
        </label>
        <textarea
          placeholder="What brings you here today? Describe your main concern..."
          className="h-24 w-full rounded-lg border border-border p-3 text-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 focus:outline-none"
          value={data?.chiefComplaint || ""}
          onChange={(e) => updateField("chiefComplaint", e.target.value)}
        />
      </div>

      {/* OLDCART Framework */}
      <div className="space-y-4 rounded-lg bg-muted p-4">
        <h3 className="font-medium text-foreground">Detailed Assessment</h3>
        <p className="text-xs text-muted-foreground">
          Help us understand your condition better
        </p>

        {/* Onset */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              <span>When did it start? (Onset)</span>
            </div>
          </label>
          <select
            className="w-full rounded-lg border border-border p-2.5 text-sm"
            value={data?.onset || ""}
            onChange={(e) => updateField("onset", e.target.value)}
          >
            <option value="">Select when symptoms started</option>
            <option value="sudden">Sudden (within hours)</option>
            <option value="1-2-days">1-2 days ago</option>
            <option value="3-5-days">3-5 days ago</option>
            <option value="1-week">1 week ago</option>
            <option value="2-weeks">2 weeks ago</option>
            <option value="1-month">1 month ago</option>
            <option value="gradual">Gradual, over time</option>
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              <span>Where is it located? (Location)</span>
            </div>
          </label>
          <input
            type="text"
            placeholder="e.g., Chest, Lower back, Head, Generalized"
            className="w-full rounded-lg border border-border p-2.5 text-sm"
            value={data?.location || ""}
            onChange={(e) => updateField("location", e.target.value)}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Does it radiate to other areas?
          </p>
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            <div className="flex items-center gap-1">
              <Clock className="size-3.5" />
              <span>How long does it last? (Duration)</span>
            </div>
          </label>
          <input
            type="text"
            placeholder="e.g., Constant, Intermittent, Lasts 30 minutes"
            className="w-full rounded-lg border border-border p-2.5 text-sm"
            value={data?.duration || ""}
            onChange={(e) => updateField("duration", e.target.value)}
          />
        </div>

        {/* Characteristics */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            <div className="flex items-center gap-1">
              <Activity className="size-3.5" />
              <span>What does it feel like? (Characteristics)</span>
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              "Sharp",
              "Dull",
              "Burning",
              "Throbbing",
              "Stabbing",
              "Cramping",
              "Pressure",
              "Heaviness",
            ].map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => {
                  const current = data?.characteristics?.split(", ") || [];
                  const updated = current.includes(char)
                    ? current.filter((c: string) => c !== char)
                    : [...current, char];
                  updateField("characteristics", updated.join(", "));
                }}
                className={`rounded-full px-3 py-1 text-xs transition-all ${
                  data?.characteristics?.includes(char)
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        {/* Aggravating factors */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            <div className="flex items-center gap-1">
              <Zap className="size-3.5" />
              <span>What makes it worse? (Aggravating)</span>
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              "Movement",
              "Coughing",
              "Eating",
              "Stress",
              "Cold",
              "Heat",
              "Lying down",
            ].map((factor) => (
              <button
                key={factor}
                type="button"
                onClick={() => {
                  const current = data?.aggravating?.split(", ") || [];
                  const updated = current.includes(factor)
                    ? current.filter((f: string) => f !== factor)
                    : [...current, factor];
                  updateField("aggravating", updated.join(", "));
                }}
                className={`rounded-full px-3 py-1 text-xs transition-all ${
                  data?.aggravating?.includes(factor)
                    ? "bg-red-100 text-red-700"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {factor}
              </button>
            ))}
          </div>
        </div>

        {/* Relieving factors */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            <div className="flex items-center gap-1">
              <Pill className="size-3.5" />
              <span>What makes it better? (Relieving)</span>
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              "Rest",
              "Medication",
              "Cold compress",
              "Heat pack",
              "Massage",
              "Position change",
            ].map((factor) => (
              <button
                key={factor}
                type="button"
                onClick={() => {
                  const current = data?.relieving?.split(", ") || [];
                  const updated = current.includes(factor)
                    ? current.filter((f: string) => f !== factor)
                    : [...current, factor];
                  updateField("relieving", updated.join(", "));
                }}
                className={`rounded-full px-3 py-1 text-xs transition-all ${
                  data?.relieving?.includes(factor)
                    ? "bg-green-100 text-green-700"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {factor}
              </button>
            ))}
          </div>
        </div>

        {/* Treatment so far */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            <div className="flex items-center gap-1">
              <Briefcase className="size-3.5" />
              <span>What have you tried? (Treatment so far)</span>
            </div>
          </label>
          <textarea
            placeholder="Medications, home remedies, consultations..."
            className="h-20 w-full rounded-lg border border-border p-2.5 text-sm"
            value={data?.treatment || ""}
            onChange={(e) => updateField("treatment", e.target.value)}
          />
        </div>
      </div>

      {/* Absence Date - for sick leave */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          <div className="flex items-center gap-2">
            <Briefcase className="size-4 text-muted-foreground" />
            <span>Need a medical certificate for work/school absence?</span>
          </div>
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={data?.needsAbsence === "yes"}
              onChange={() => updateField("needsAbsence", "yes")}
              className="size-4"
            />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={data?.needsAbsence === "no"}
              onChange={() => updateField("needsAbsence", "no")}
              className="size-4"
            />
            <span className="text-sm">No</span>
          </label>
        </div>

        {data?.needsAbsence === "yes" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-foreground">
              Date/s of absence
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-border p-2.5 text-sm"
              value={data?.absenceDate || ""}
              onChange={(e) => updateField("absenceDate", e.target.value)}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              You can select multiple dates after the consult
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
