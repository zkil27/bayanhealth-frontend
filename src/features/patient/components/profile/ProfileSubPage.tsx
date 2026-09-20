import type { ReactNode } from "react";
import { PatientPageHeader } from "@/features/patient/components/PatientPageHeader";

/**
 * Shell for the two editors reached from `/patient/profile`: a back control to the
 * settings list, a title, and the editor itself on a card.
 */
export function ProfileSubPage({
  title,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-start pb-4">
      <PatientPageHeader
        title={title}
        backHref="/patient/profile"
      />
      <section className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-4 pb-8 md:max-w-3xl md:px-8 lg:mx-0 lg:pl-[18rem] lg:pr-8 lg:max-w-[calc(48rem+18rem)]">
        <div className="rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card) md:p-6">
          {children}
        </div>
      </section>
    </div>
  );
}
