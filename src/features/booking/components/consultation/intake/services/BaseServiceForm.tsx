"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { FormSection } from "../../../FormSection";

interface BaseServiceFormProps {
  icon: LucideIcon;
  title: string;
  description: string;
  styles: {
    border: string;
    bg: string;
    text: string;
  };
  children?: ReactNode;
}

export function BaseServiceForm({
  icon: Icon,
  title,
  description,
  styles,
  children,
}: BaseServiceFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className={`rounded-xl bg-primary p-4 transition-all`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-full bg-transparent p-2 shadow-sm shadow-white">
            <Icon className={`size-6 ${styles.text} stroke-white`} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-primary-foreground">{title}</h2>
            <p className="mt-0.5 text-xs font-semibold text-primary-foreground/80">
              {description}
            </p>
          </div>
        </div>
      </div>

      <FieldSet>
        <FieldGroup>
          <FormSection
            icon={<Icon className="size-4" />}
            title={`${title} Details`}
          />
          {children}
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
