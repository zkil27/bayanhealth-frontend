import { HeartPulse, Stethoscope } from "lucide-react";
import { useSignUpRole, useSignUpStore } from "../../stores/useSignUpStore";
import { cn } from "@/lib/utils";

export function SignUpRoleSelection() {
  const currentRole = useSignUpRole();
  const setRole = useSignUpStore((s) => s.setRole);

  const roles = [
    {
      id: "patient",
      title: "Patient",
      description: "Book appointments and consult doctors.",
      icon: HeartPulse,
    },
    {
      id: "doctor",
      title: "Doctor",
      description: "Manage clinic, consultations and patients.",
      icon: Stethoscope,
    },
  ] as const;

  return (
    <div className="w-full py-1">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {roles.map((role) => {
          const Icon = role.icon;
          const isSelected = currentRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setRole(role.id)}
              className={cn(
                "group flex min-h-[110px] flex-col items-center justify-center rounded-xl border p-3.5 sm:p-4 text-center transition-all cursor-pointer select-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-primary",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                  : "border-border bg-card hover:border-primary/50 hover:bg-accent/40",
              )}
            >
              <div
                className={cn(
                  "mb-2 flex size-10 items-center justify-center rounded-full transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary group-hover:bg-primary/20",
                )}
              >
                <Icon className="size-5" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {role.title}
              </span>
              <span className="mt-1 text-[11px] leading-tight text-muted-foreground line-clamp-2">
                {role.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
