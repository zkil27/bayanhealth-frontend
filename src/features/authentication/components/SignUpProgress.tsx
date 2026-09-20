import type { SignUpRole } from "@/features/authentication/signup-handoff";

export function SignupProgress({
  step,
  role,
}: {
  step: number;
  role: SignUpRole | null;
}) {
  return (
    <div className="flex w-full flex-col text-sm font-medium">
      <p className="text-xs capitalize text-muted-foreground">{role}</p>
      <div className="flex flex-col gap-2">
        <span className="text-foreground">Step {step} of 4</span>
        <div className="flex w-full gap-1.5">
          {[1, 2, 3, 4].map((currentStep) => (
            <div
              key={currentStep}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentStep === step
                  ? "w-1/2 bg-primary"
                  : currentStep < step
                    ? "w-1/5 bg-primary/50"
                    : "w-1/5 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
