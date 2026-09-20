import {
  BookUser,
  BriefcaseBusiness,
  PhoneCall,
  TrafficCone,
} from "lucide-react";

/**
 * Backend serviceType enum values from openapi.yaml CreateBookingRequest.serviceType.
 * These are the values the API sends and expects — use these when sending/reading bookings.
 */
export type BookingServiceType = "general" | "specialist" | "follow_up" | "emergency";

/**
 * Display metadata for each service type, keyed to the backend enum value.
 * Used in the doctor board to render icons and labels for incoming bookings.
 */
export const bookingServices: {
  sticker: React.ComponentType<{ className?: string }>;
  label: string;
  value: BookingServiceType;
}[] = [
  {
    sticker: PhoneCall,
    label: "General Consultation",
    value: "general",
  },
  {
    sticker: BookUser,
    label: "Specialist Referral",
    value: "specialist",
  },
  {
    sticker: TrafficCone,
    label: "Follow-up",
    value: "follow_up",
  },
  {
    sticker: BriefcaseBusiness,
    label: "Emergency",
    value: "emergency",
  },
];
