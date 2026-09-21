import type { SignUpRole } from "@/features/authentication/signup-handoff";

export function SignupProgress({
  step,
  role,
}: {
  step: number;
  role: SignUpRole | null;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5 text-xs">
      <div className="flex items-center justify-between font-medium">
        <span className="capitalize text-muted-foreground">
          {role ? `${role} Account` : "New Account"}
        </span>
        <span className="font-semibold text-foreground">Step {step} of 4</span>
      </div>
      <div className="flex w-full gap-1.5">
        {[1, 2, 3, 4].map((currentStep) => (
          <div
            key={currentStep}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              currentStep === step
                ? "bg-primary"
                : currentStep < step
                  ? "bg-primary/50"
                  : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
