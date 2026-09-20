import { FieldSeparator } from "@/components/ui/field";
import { cn } from "@/lib/tiptap-utils";
import { ReactNode } from "react";

type FormSectionProps = {
  icon?: ReactNode;
  title: string;
  className?: string;
};

export function FormSection({ icon, title, className }: FormSectionProps) {
  return (
    <>
      <FieldSeparator>
        <div
          className={cn(
            "flex items-center gap-1 font-bold text-primary",
            className,
          )}
        >
          {icon}
          {title}
        </div>
      </FieldSeparator>
    </>
  );
}
