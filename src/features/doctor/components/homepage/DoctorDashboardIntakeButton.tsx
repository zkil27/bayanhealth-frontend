"use client";

import { Info, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useId, useState } from "react";
import ToastForTesting from "@/components/primitives/ToastForTesting";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { socialShareLogos } from "@/components/primitives/icons/SocialShareLogos";

export function DoctorDashboardIntakeButton() {
  const [contactValue, setContactValue] = useState("");
  const [patientName, setPatientName] = useState("");
  const [contactType, setContactType] = useState<"email" | "mobile" | null>(
    null,
  );
  const emailId = useId();
  const contactId = useId();
  const formId = useId();

  const detectContactType = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^(\+63|0)[0-9]{10,11}$/;

    if (emailRegex.test(value)) return "email";
    if (mobileRegex.test(value)) return "mobile";
    return null;
  };

  const handleContactChange = (value: string) => {
    setContactValue(value);
    setContactType(detectContactType(value));
  };

  const handlePatient = (value: string) => {
    setPatientName(value);
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = {
      name: patientName,
      contactType: contactType,
      contactValue: contactValue,
    };

    ToastForTesting(data);
  };
  const handleSocialShare = (social: string) => {
    ToastForTesting(social);
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Send Intake Link"
            className="flex size-9 items-center justify-center rounded-lg border border-(--border-subtle) bg-(--surface-card) text-(--text-muted) transition-colors hover:border-(--border-default) hover:bg-(--surface-accent-soft) hover:text-(--action-primary)"
          >
            <Link2 className="size-4" />
          </button>
        }
      />
      <DialogContent className="border border-(--border-subtle) bg-(--surface-card) p-6 sm:max-w-md shadow-xl">
        <DialogHeader className="items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-(--border-subtle) bg-(--surface-warm) text-(--teal-700)">
            <Link2 className="size-5" />
          </div>
          <DialogTitle className="text-base font-bold text-(--text-heading)">Send Intake Link</DialogTitle>
          <DialogDescription className="text-center text-xs text-(--text-muted)">
            Send an encrypted intake form link directly to patients for faster pre-consultation triage.
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 mt-2"
        >
          <div className="grid gap-2">
            <Label htmlFor={emailId} className="text-xs font-semibold text-(--text-heading)">Patient Name</Label>
            <Input
              type="text"
              id={emailId}
              name="patientName"
              value={patientName}
              onChange={(e) => handlePatient(e.target.value)}
              placeholder="e.g. Maria Santos"
              className="h-10 text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={contactId} className="text-xs font-semibold text-(--text-heading)">Mobile or Email</Label>
            <Input
              id={contactId}
              value={contactValue}
              onChange={(e) => handleContactChange(e.target.value)}
              placeholder="+63 912 345 6789 or patient@email.com"
              className="h-10 text-sm"
            />
            {contactType && (
              <p className="text-xs font-medium text-(--teal-700)">
                Will send via {contactType === "email" ? "email" : "SMS"}
              </p>
            )}
          </div>
        </form>
        <DialogFooter className="flex-col gap-3 pt-3 sm:flex-col">
          <Button type="submit" variant="primary" form={formId} className="h-11 w-full text-sm sm:h-9">
            Send Intake Link
          </Button>
          <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-(--border-subtle) after:h-px after:flex-1 after:bg-(--border-subtle)">
            <span className="text-[11px] font-medium text-(--text-subtle) uppercase tracking-wider">Or share via</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {Object.entries(socialShareLogos).map(([key, value]) => (
              <Button
                key={key}
                type="button"
                onClick={() => handleSocialShare(value.name)}
                variant="outline"
                className="flex size-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-(--border-subtle) bg-(--surface-warm)/50 p-1 hover:bg-(--surface-warm-soft)"
              >
                <span className="size-4 shrink-0">{value.icon}</span>
                <span className="text-[10px] text-(--text-muted)">{value.name}</span>
              </Button>
            ))}
          </div>
          <div className="flex justify-end pt-1">
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="gap-1 text-[11px] text-(--text-muted) hover:text-(--text-heading)"
                  >
                    <Info className="size-3 text-(--teal-700)" />
                    <span>Intake policy</span>
                  </Button>
                }
              />
              <PopoverContent sideOffset={8} align="end" className="w-72 p-3">
                <PopoverHeader className="gap-1">
                  <PopoverTitle className="text-xs font-semibold text-(--text-heading)">Clinical Intake Link Policy</PopoverTitle>
                  <PopoverDescription className="text-xs leading-relaxed text-(--text-muted)">
                    Links are single-use and expire upon submission. Medical information submitted by the patient is securely encrypted and routed directly to your incoming triage queue.
                  </PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
