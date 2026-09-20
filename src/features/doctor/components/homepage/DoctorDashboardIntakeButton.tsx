"use client";

import { Info, Link2 } from "lucide-react";

import AppButton from "@/components/primitives/AppButton";
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
      <DialogTrigger>
        <div className="relative cursor-pointer rounded-lg p-2 transition-all duration-300 hover:bg-primary hover:text-white">
          <Link2 />
        </div>
      </DialogTrigger>
      <DialogContent className="bg-linear-to-b from-sky-100 to-card to-40% bg-size-[100%_101%] p-6 sm:max-w-sm dark:from-sky-900">
        <DialogHeader className="items-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-sky-600/10 sm:mx-0 dark:bg-sky-400/10">
            <Link2 className="size-6 text-sky-600 dark:text-sky-400" />
          </div>
          <DialogTitle>Send Intake Link</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Send Intake Link directly to Patients for faster Booking.
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-3">
            <Label htmlFor={emailId}>Patient Name</Label>
            <Input
              type="text"
              id={emailId}
              name="patientName"
              value={patientName}
              onChange={(e) => handlePatient(e.target.value)}
              placeholder="Enter Patient Name"
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor={contactId}>Mobile or Email</Label>
            <Input
              id={contactId}
              value={contactValue}
              onChange={(e) => handleContactChange(e.target.value)}
              placeholder="+63 912 345 6789 or patient@email.com"
            />
            {contactType && (
              <p className="text-xs text-primary">
                Will send via {contactType === "email" ? "email" : "SMS"}
              </p>
            )}
          </div>
        </form>
        <DialogFooter className="space-y-2 pt-4 sm:flex-col">
          <AppButton type="submit" variant="business" form={formId}>
            Send Intake Link
          </AppButton>
          <div className="flex items-center gap-4 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            <span className="text-xs text-muted-foreground">Or Send via</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {Object.entries(socialShareLogos).map(([key, value]) => (
              <AppButton
                key={key}
                onClick={() => handleSocialShare(value.name)}
                variant="outline"
                className="flex size-12 flex-1 cursor-pointer flex-col border-none hover:bg-muted"
              >
                {value.icon}
                <span className="text-xs">{value.name}</span>
              </AppButton>
            ))}
          </div>
          <Popover>
            <PopoverTrigger
              render={
                <AppButton
                  variant="outline"
                  className="ml-auto w-20 border-0 text-[10px] text-secondary hover:bg-muted"
                >
                  <Info className="text-secondary" />
                  <span>Reminder</span>
                </AppButton>
              }
            ></PopoverTrigger>
            <PopoverContent sideOffset={-60} alignOffset={200} align="start">
              <PopoverHeader>
                <PopoverTitle>Sending Intake Link Policy</PopoverTitle>
                <PopoverDescription>
                  Sending Intake Link Policy. Sending Intake Link Policy.
                  Sending Intake Link Policy. Sending Intake Link Policy.
                  Sending Intake Link Policy. Sending Intake Link Policy.
                  Sending Intake Link Policy. Sending Intake Link Policy.
                  Sending Intake Link Policy.
                </PopoverDescription>
                <AppButton>More info</AppButton>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
