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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import AppButton from "@/components/primitives/AppButton";
import { EndUserRoles } from "@/types/user.types";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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

  const termsBody = (
    <div className="space-y-4 text-sm text-(--text-body)">
      <h4 className="font-semibold text-foreground">1. Agreement to Terms</h4>
      <p>
        By accessing and using this service, you accept and agree to be
        bound by the terms and provision of this agreement.
      </p>

      <h4 className="font-semibold text-foreground">2. Use License</h4>
      <p>
        Permission is granted to temporarily download one copy of the
        materials on our service for personal, non-commercial transitory
        viewing only.
      </p>

      <h4 className="font-semibold text-foreground">3. Disclaimer</h4>
      <p>
        The materials on our service are provided on an {`'as is'`}{" "}
        basis. We make no warranties, expressed or implied, and hereby
        disclaim and negate all other warranties.
      </p>

      <h4 className="font-semibold text-foreground">4. Limitations</h4>
      <p>
        In no event shall we or our suppliers be liable for any damages
        (including, without limitation, damages for loss of data or
        profit, or due to business interruption) arising out of the use
        or inability to use our service.
      </p>

      <h4 className="font-semibold text-foreground">5. Revisions</h4>
      <p>
        We may revise these terms of service at any time without notice.
        By using this service you are agreeing to be bound by the then
        current version of these terms of service.
      </p>

      <h4 className="font-semibold text-foreground">6. Governing Law</h4>
      <p>
        These terms and conditions are governed by and construed in
        accordance with the laws and you irrevocably submit to the
        exclusive jurisdiction of the courts in that location.
      </p>

      <h4 className="font-semibold text-foreground">
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
  );

  return (
    <div className="w-full space-y-3">
      <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id={name}
            checked={value}
            onChange={handleCheckboxChange}
            onBlur={onBlur}
            disabled={disabled}
            className="mt-1 size-4 rounded border-input text-(--action-primary) focus:ring-(--focus-ring) disabled:opacity-50 cursor-pointer"
          />
          <label htmlFor={name} className="cursor-pointer text-sm text-foreground">
            I agree to the{" "}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-(--action-primary) hover:underline font-semibold"
              disabled={disabled}
            >
              Terms and Conditions
            </button>{" "}
            for {role === "patient" ? "patients" : "doctors"}.
          </label>
        </div>
      </div>

      {isMobile ? (
        <Drawer open={modalOpen} onOpenChange={handleOpenChange}>
          <DrawerContent className="max-h-[90dvh]">
            <DrawerHeader>
              <DrawerTitle className="text-center font-semibold text-(--navy-700)">
                Terms and Conditions
              </DrawerTitle>
              <DrawerDescription className="text-center text-xs text-muted-foreground mt-0.5">
                Please read and scroll to the bottom to accept.
              </DrawerDescription>
            </DrawerHeader>

            <div
              className="flex-1 overflow-y-auto px-4 py-2 min-h-0"
              onScrollCapture={handleScroll}
              ref={scrollAreaRef}
            >
              {termsBody}
            </div>

            <DrawerFooter className="flex-row gap-2 border-t border-(--border-subtle) p-3">
              <AppButton
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </AppButton>
              <AppButton
                className="flex-1 h-11 bg-(--action-primary) text-white font-medium hover:bg-(--action-primary)/90"
                disabled={!hasScrolledToBottom}
                onClick={handleAccept}
              >
                I Agree
              </AppButton>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
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
              {termsBody}
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
      )}
    </div>
  );
}