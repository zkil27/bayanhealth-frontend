// components/forms/TermsAndConditions.tsx
"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import AppButton from "@/components/primitives/AppButton";
import { EndUserRoles } from "@/types/user.types";

interface TermsAndConditionsProps {
  value?: boolean;
  onChange?: (checked: boolean) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;
  role: EndUserRoles;
}

export function SignUpTermsAndConditions({
  value = false,
  onChange,
  onBlur,
  name = "terms",
  disabled = false,
  role,
}: TermsAndConditionsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const isAtBottom =
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <
      10;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    onChange?.(true);
    setModalOpen(false);
    setHasScrolledToBottom(false);
  };

  const handleOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setHasScrolledToBottom(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      setModalOpen(true);
    } else {
      onChange?.(false);
      onBlur?.();
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900/50">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id={name}
            checked={value}
            onChange={handleCheckboxChange}
            onBlur={onBlur}
            disabled={disabled}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
          />
          <label htmlFor={name} className="cursor-pointer text-sm">
            I agree to the{" "}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-primary hover:underline"
              disabled={disabled}
            >
              Terms and Conditions
            </button>{" "}
            for {role === "patient" ? "patients" : "doctors"}.
          </label>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="z-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
            <DialogDescription>
              Please read and scroll to the bottom to accept.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea
            className="h-75 pr-4"
            onScrollCapture={handleScroll}
            ref={scrollAreaRef}
          >
            <div className="space-y-4 text-sm">
              <h4 className="font-semibold">1. Agreement to Terms</h4>
              <p>
                By accessing and using this service, you accept and agree to be
                bound by the terms and provision of this agreement.
              </p>

              <h4 className="font-semibold">2. Use License</h4>
              <p>
                Permission is granted to temporarily download one copy of the
                materials on our service for personal, non-commercial transitory
                viewing only.
              </p>

              <h4 className="font-semibold">3. Disclaimer</h4>
              <p>
                The materials on our service are provided on an {`'as is'`}{" "}
                basis. We make no warranties, expressed or implied, and hereby
                disclaim and negate all other warranties.
              </p>

              <h4 className="font-semibold">4. Limitations</h4>
              <p>
                In no event shall we or our suppliers be liable for any damages
                (including, without limitation, damages for loss of data or
                profit, or due to business interruption) arising out of the use
                or inability to use our service.
              </p>

              <h4 className="font-semibold">5. Revisions</h4>
              <p>
                We may revise these terms of service at any time without notice.
                By using this service you are agreeing to be bound by the then
                current version of these terms of service.
              </p>

              <h4 className="font-semibold">6. Governing Law</h4>
              <p>
                These terms and conditions are governed by and construed in
                accordance with the laws and you irrevocably submit to the
                exclusive jurisdiction of the courts in that location.
              </p>

              <h4 className="font-semibold">
                7. Additional Terms for{" "}
                {role === "patient" ? "Patients" : "Doctors"}
              </h4>
              <ul className="list-disc space-y-1 pl-4">
                <li>Provide accurate and complete information</li>
                <li>Keep your account credentials secure</li>
                {role === "doctor" ? (
                  <>
                    <li>Maintain valid medical license and credentials</li>
                    <li>Provide professional medical services responsibly</li>
                    <li>Respect patient confidentiality and privacy</li>
                    <li>Keep your schedule availability up to date</li>
                  </>
                ) : (
                  <>
                    <li>Provide accurate health information</li>
                    <li>
                      Respect appointment times and provide cancellation notice
                    </li>
                    <li>Not misuse the platform for emergency situations</li>
                  </>
                )}
                <li>Comply with all applicable laws and regulations</li>
                <li>Accept that violation may result in account termination</li>
              </ul>
            </div>
          </ScrollArea>

          <DialogFooter>
            <AppButton variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </AppButton>
            <AppButton disabled={!hasScrolledToBottom} onClick={handleAccept}>
              I Agree
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}