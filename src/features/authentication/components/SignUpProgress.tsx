import type { SignUpRole } from "@/features/authentication/signup-handoff";

export function SignupProgress({
  step,
  role,
}: {
  step: number;
  role: SignUpRole | null;
}) {
  const percentage = Math.min(100, Math.max(0, (step / 4) * 100));

  return (
    <div className="flex w-full flex-col gap-2 text-xs">
      <div className="flex items-center justify-between font-medium">
        <span className="capitalize text-muted-foreground font-semibold">
          {role ? `${role} Account` : "New Account"}
        </span>
        <span className="font-semibold text-foreground">Step {step} of 4</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
