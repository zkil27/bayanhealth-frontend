"use client";

import { Moon, Clock, Stethoscope } from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MoonlightShift {
  id: string;
  patientLabel: string;
  reason: string;
  waitingSince: string;
  mode: "Video" | "Chat" | "Audio";
}

/**
 * Fetches the after-hours patient queue from the backend.
 * Returns an empty array until the Moonlight backend endpoint is live —
 * the page renders an empty state rather than fake data.
 */
async function fetchMoonlightQueue(): Promise<MoonlightShift[]> {
  return [];
}

const MODE_VARIANT: Record<
  MoonlightShift["mode"],
  "default" | "secondary" | "outline"
> = {
  Video: "default",
  Chat: "secondary",
  Audio: "outline",
};

export default function Page() {
  return (
    <section className="flex h-full w-full flex-col gap-6 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
          <Moon className="h-5 w-5" />
        </span>
        <div className="flex flex-col leading-tight">
          <h1 className="text-2xl font-semibold">Moonlight Mode</h1>
          <p className="text-sm text-muted-foreground">
            After-hours on-demand consultations waiting for a doctor.
          </p>
        </div>
      </div>

      <AsyncView fetcher={fetchMoonlightQueue}>
        {(shifts) =>
          shifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 p-12 text-center text-muted-foreground">
              <Moon className="h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">No patients in the queue</p>
              <p className="text-xs">
                After-hours requests will appear here when Moonlight mode is
                active.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shifts.map((shift) => (
                <Card key={shift.id} className="border-l-3 border-secondary">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {shift.patientLabel}
                      </CardTitle>
                      <Badge variant={MODE_VARIANT[shift.mode]}>
                        {shift.mode}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5" />
                      {shift.reason}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Waiting since {shift.waitingSince}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
      </AsyncView>
    </section>
  );
}
