"use client";
import { ScrollArea } from "@/components/ui/scroll-area";


interface ScheduleDay {
  start: string;
  end: string;
  enabled: boolean;
}

interface ScheduleAvailabilityProps {
  availability: {
    monday: ScheduleDay;
    tuesday: ScheduleDay;
    wednesday: ScheduleDay;
    thursday: ScheduleDay;
    friday: ScheduleDay;
    saturday: ScheduleDay;
    sunday: ScheduleDay;
  };
  onChange: (availability: ScheduleAvailabilityProps["availability"]) => void;
}

const days = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thurs" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

export function ScheduleAvailability({
  availability,
  onChange,
}: ScheduleAvailabilityProps) {
  const updateDay = (day: string, updates: Partial<ScheduleDay>) => {
    onChange({
      ...availability,
      [day]: { ...availability[day as keyof typeof availability], ...updates },
    });
  };

  return (
    <div className="w-full space-y-3">
      <div className="text-left">
        <h3 className="text-lg font-semibold">Schedule Availability</h3>
        <p className="text-sm text-muted-foreground">
          Set your consultation hours
        </p>
      </div>

      <ScrollArea className="h-30 w-full max-w-md rounded-md border bg-background">
        {days.map((day) => {
          const dayData = availability[day.key as keyof typeof availability];
          return (
            <div
              key={day.key}
              className="flex items-center gap-3 rounded-lg border p-2"
            >
              <input
                type="checkbox"
                checked={dayData.enabled}
                onChange={(e) =>
                  updateDay(day.key, { enabled: e.target.checked })
                }
                className="h-4 w-4"
              />
              <span className="w-24 text-sm font-medium">{day.label}</span>
              {dayData.enabled ? (
                <div className="flex flex-1 gap-2">
                  <input
                    type="time"
                    value={dayData.start}
                    onChange={(e) =>
                      updateDay(day.key, { start: e.target.value })
                    }
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <span className="text-xs">to</span>
                  <input
                    type="time"
                    value={dayData.end}
                    onChange={(e) =>
                      updateDay(day.key, { end: e.target.value })
                    }
                    className="rounded border px-2 py-1 text-sm"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Unavailable
                </span>
              )}
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}
