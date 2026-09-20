"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Info, Package, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Prescription {
  genericName: string;
  brandName: string;
  strength: string;
  form: string;
  instruction: string;
  dispenseAmount: number;
  refills: number;
  displayText: string;
}

interface PrescriptionCardProps {
  prescription: Prescription;
  onRemove: () => void;
  readOnly?: boolean;
}

export function PrescriptionCard({
  prescription,
  onRemove,
  readOnly = false,
}: PrescriptionCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showConfirm) {
      timer = setTimeout(() => {
        setShowConfirm(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showConfirm]);

  const handleDeleteClick = () => {
    if (readOnly) return;
    if (!showConfirm) {
      setShowConfirm(true);
    } else {
      onRemove();
    }
  };

  return (
    <div className="relative animate-in overflow-hidden rounded-lg bg-muted p-4 duration-500 fade-in slide-in-from-left-2">
      {!readOnly ? (
        <div className="absolute top-2 right-2 flex h-7 items-center justify-end">
          <Button
            variant={showConfirm ? "destructive" : "ghost"}
            size="sm"
            className="flex h-7 items-center justify-center gap-1.5 overflow-hidden px-2 transition-all duration-300 ease-in-out"
            onClick={handleDeleteClick}
          >
            <Trash2
              className={cn(
                "h-3 w-3 shrink-0 transition-transform duration-300 ease-in-out",
                showConfirm && "scale-90",
              )}
            />
            <span
              className={cn(
                "origin-right text-xs font-medium whitespace-nowrap transition-all duration-300 ease-in-out",
                showConfirm
                  ? "w-auto translate-x-0 scale-100 opacity-100"
                  : "pointer-events-none w-0 translate-x-2 scale-95 opacity-0",
              )}
            >
              Confirm Delete
            </span>
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          "space-y-1 transition-all duration-300 ease-in-out",
          showConfirm ? "pr-36" : "pr-8",
        )}
      >
        <p className="font-medium">{prescription.displayText}</p>
        <p className="text-sm text-muted-foreground">
          Generic : {prescription.genericName}
        </p>
        <p className="flex items-center gap-1 text-sm">
          <Info className="h-4 w-4 text-muted-foreground" />
          {prescription.instruction}
        </p>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Package className="h-4 w-4 text-muted-foreground" />
            Dispense: #{prescription.dispenseAmount}
          </span>
          <span className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            Refills: {prescription.refills}
          </span>
        </div>
      </div>
    </div>
  );
}
