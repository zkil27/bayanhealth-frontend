import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { BookUser } from "lucide-react";

export function PatientMoreDetails() {
  return (
    <div>
      <Drawer swipeDirection="right">
        <DrawerTrigger>
          <span className="flex gap-0.5 items-center text-xs hover:bg-muted rounded-lg px-1 py-0.5 cursor-pointer">
            <BookUser className="size-4" /> More details
          </span>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Patient Details</DrawerTitle>
            <DrawerDescription>
              Full patient information for this consultation.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 p-4">
            <p className="text-sm text-muted-foreground">
              Patient details are loaded from the consultation record. Open this
              workspace from an active consultation to view full patient information.
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
