import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { BookUser, X } from "lucide-react";

export function PatientMoreDetails() {
  return (
    <div>
      <Drawer swipeDirection="right">
        <DrawerTrigger
          render={
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-(--text-muted) transition-colors hover:bg-(--surface-warm-soft) hover:text-(--text-heading)"
            >
              <BookUser className="size-3.5 text-(--teal-700)" />
              <span>More details</span>
            </button>
          }
        />
        <DrawerContent className="flex flex-col p-0 sm:max-w-md border-l border-(--border-subtle) bg-(--surface-card) shadow-2xl">
          <DrawerHeader className="border-b border-(--border-subtle) bg-(--surface-warm) px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DrawerTitle className="text-base font-bold text-(--text-heading)">Patient Details</DrawerTitle>
                <DrawerDescription className="text-xs text-(--text-muted) mt-0.5">
                  Full patient information for this consultation.
                </DrawerDescription>
              </div>
              <DrawerClose
                render={
                  <button
                    type="button"
                    aria-label="Close"
                    className="flex size-8 items-center justify-center rounded-lg text-(--text-muted) transition-colors hover:bg-(--surface-warm-soft) hover:text-(--text-heading)"
                  >
                    <X className="size-4" />
                  </button>
                }
              />
            </div>
          </DrawerHeader>
          <div className="flex flex-col gap-4 p-5">
            <p className="text-xs leading-relaxed text-(--text-muted)">
              Patient details are loaded from the consultation record. Open this
              workspace from an active consultation to view full patient information.
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
