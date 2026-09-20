import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Apple, HeartPlus } from "lucide-react";
import { useSignUpStore } from "../../stores/useSignUpStore";

export function SignUpRoleSelection() {
  const setRole = useSignUpStore((s) => s.setRole);

  const roles = [
    {
      id: "patient",
      title: "Patient",
      description: "Book appointments and consult with a doctor.",
      icon: Apple,
    },
    {
      id: "doctor",
      title: "Doctor",
      description:
        "Provide quality care, manage your own clinic schedule, and reach more patients.",
      icon: HeartPlus,
    },
  ] as const;

  return (
    <div className="w-full">
      <h2 className="mb-4 text-center text-lg font-semibold">
        Sign up as?
      </h2>
      <div className="flex flex-col gap-4">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Card
              key={role.id}
              className="cursor-pointer border-2 transition-all hover:border-primary hover:bg-accent/50"
              onClick={() => setRole(role.id)}
            >
              <CardHeader className="py-4 text-center">
                <div className="mx-auto mb-2 w-fit rounded-full bg-primary/10 p-3">
                  <Icon />
                </div>
                <CardTitle>{role.title}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
