"use client";

import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppLogo } from "@/components/primitives/Logo/AppLogo";
import { TriangleAlert } from "lucide-react";
import {
  groupMedicationsForA4,
  type PrescriptionPreviewData,
} from "./prescriptionPreview";

interface PrescriptionPagedContentProps {
  data: PrescriptionPreviewData;
  variant?: "draft" | "finalized";
}

const PrescriptionIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || "h-12 w-12 text-primary"}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" y1="4" x2="4" y2="20" />
    <path d="M4 4h6a4 4 0 0 1 0 8H4" />
    <path d="M10 12l6.5 8" />
    <path d="M16 14l-4 6" />
    <path d="M17 6h6" />
    <path d="M20 4v7" />
  </svg>
);

export function PrescriptionPagedContent({
  data,
  variant = "finalized",
}: PrescriptionPagedContentProps) {
  const isDraft = variant === "draft";
  const medicationGroups = groupMedicationsForA4(data.medications);
  const canDisplayVerification = !isDraft && Boolean(data.verificationCode);
  const canDisplaySignature =
    !isDraft && Boolean(data.signature?.physicianName);
  const canDisplayPhysician =
    !isDraft &&
    Boolean(
      data.physician?.name ||
      data.physician?.licenseNumber ||
      data.physician?.ptrNumber ||
      data.physician?.s2Number,
    );

  return (
    <>
      {medicationGroups.map((group, pageIndex) => {
        const pageNumber = pageIndex + 1;
        return (
          <article
            key={pageNumber}
            className="page relative mx-auto mb-2 flex flex-col rounded-lg bg-background p-12 shadow-lg"
          >
            {isDraft ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex -rotate-45 items-center justify-center text-center text-7xl font-bold tracking-wide text-destructive/20">
                DRAFT ONLY
              </div>
            ) : null}

            <header className="flex shrink-0 items-start justify-between border-b-2 border-border pb-3">
              <div className="flex min-h-24 w-28 flex-col items-center justify-center text-center">
                {canDisplayVerification ? (
                  <>
                    <div className="rounded-lg border-2 border-border bg-background p-2">
                      <QRCodeSVG
                        data-testid="verification-qr"
                        value={data.verificationCode!}
                        size={90}
                        level="H"
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Prescription verification
                    </p>
                  </>
                ) : (
                  <Badge
                    data-testid="draft-status"
                    variant="destructive"
                    className="text-sm"
                  >
                    <TriangleAlert /> DRAFT ONLY
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center">
                <AppLogo height={0} width={300} type="withText" />
                {isDraft ? (
                  <p className="text-center text-xs font-semibold text-destructive">
                    NOT VERIFIED — NOT FOR DISPENSING
                  </p>
                ) : null}
              </div>
              <div className="w-28 text-right text-xs text-muted-foreground">
                <p>
                  Page {pageNumber} of {medicationGroups.length}
                </p>
              </div>
            </header>

            <main className="flex-1 px-5 py-4">
              {data.patient?.name ||
              data.patient?.age !== undefined ||
              data.patient?.sex ||
              data.patient?.address ? (
                <div className="mb-4 grid grid-cols-5 gap-4">
                  {data.patient?.name ? (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">
                        PATIENT NAME
                      </p>
                      <p className="text-sm font-semibold">
                        {data.patient.name}
                      </p>
                    </div>
                  ) : null}
                  {data.patient?.age !== undefined || data.patient?.sex ? (
                    <div>
                      <p className="text-xs text-muted-foreground">AGE / SEX</p>
                      <p className="text-sm font-semibold">
                        {[data.patient?.age, data.patient?.sex]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    </div>
                  ) : null}
                  {data.patient?.address ? (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">ADDRESS</p>
                      <p className="text-sm font-semibold">
                        {data.patient.address}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <PrescriptionIcon className="mb-2 size-15 text-secondary print:size-10" />
              <div className="flex flex-col gap-2">
                {group.map((medication, index) => (
                  <section
                    key={`${medication.genericName}-${index}`}
                    className="rounded-lg bg-muted p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {medication.genericName}
                          {medication.brandName ? (
                            <span className="ml-1 font-normal text-muted-foreground">
                              ({medication.brandName})
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="ml-4 shrink-0 text-right">
                        <p className="text-sm font-bold">
                          {medication.strength}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {medication.quantity} {medication.unit}
                        </p>
                      </div>
                    </div>
                    {medication.instructions ? (
                      <p className="mt-1 pl-6 text-sm">
                        {medication.instructions}
                      </p>
                    ) : null}
                    {medication.instructionsTagalog ? (
                      <p className="mt-0.5 pl-6 text-xs text-muted-foreground italic">
                        {medication.instructionsTagalog}
                      </p>
                    ) : null}
                  </section>
                ))}
              </div>
            </main>

            <footer className="shrink-0">
              {data.notes ? (
                <div className="mb-3 rounded-lg border border-status-pending bg-status-pending p-3 text-sm text-status-pending-foreground">
                  {data.notes}
                </div>
              ) : null}
              {data.validityDays ? (
                <p className="mb-2 text-xs text-muted-foreground">
                  Valid for{" "}
                  <span className="font-semibold text-foreground">
                    {data.validityDays} days
                  </span>
                </p>
              ) : null}
              {canDisplayVerification ||
              canDisplaySignature ||
              canDisplayPhysician ? (
                <Separator className="my-2" />
              ) : null}
              {canDisplayVerification ? (
                <p className="text-xs text-muted-foreground">
                  Verification code:{" "}
                  <span className="font-mono font-bold text-foreground">
                    {data.verificationCode}
                  </span>
                </p>
              ) : null}
              {canDisplaySignature ? (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Digitally signed by
                  </p>
                  <p className="text-sm font-bold">
                    {data.signature!.physicianName}
                  </p>
                  {data.signature?.signedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Signed: {data.signature.signedAt}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {canDisplayPhysician ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  {data.physician?.name ? (
                    <p className="font-semibold text-foreground">
                      {data.physician.name}
                      {data.physician.title ? `, ${data.physician.title}` : ""}
                    </p>
                  ) : null}
                  {data.physician?.licenseNumber ? (
                    <p>License No: {data.physician.licenseNumber}</p>
                  ) : null}
                  {data.physician?.ptrNumber ? (
                    <p>PTR No: {data.physician.ptrNumber}</p>
                  ) : null}
                  {data.physician?.s2Number ? (
                    <p>S2 No: {data.physician.s2Number}</p>
                  ) : null}
                </div>
              ) : null}
              {isDraft ? (
                <p className="mt-3 text-sm font-semibold text-destructive">
                  DRAFT ONLY — not verified and not valid for dispensing.
                </p>
              ) : null}
            </footer>
          </article>
        );
      })}
    </>
  );
}
