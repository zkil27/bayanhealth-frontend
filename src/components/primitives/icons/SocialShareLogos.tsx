import { Mails, MessageSquareMore, Video } from "lucide-react";
import Image from "next/image";
import { ReactNode } from "react";
import { AppLogo } from "../Logo/AppLogo";

interface PreferenceItem {
  icon: ReactNode;
  name: string;
}

export const socialShareLogos: Record<string, PreferenceItem> = {
  messenger: {
    icon: (
      <Image
        src="/socials/messenger-icon.svg"
        alt="Messenger icon"
        height={16}
        width={16}
        unoptimized
      />
    ),
    name: "Messenger",
  },
  whatsapp: {
    icon: (
      <Image
        src="/socials/whatsapp-icon.svg"
        alt="WhatsApp icon"
        height={16}
        width={16}
        unoptimized
      />
    ),
    name: "WhatsApp",
  },
  viber: {
    icon: (
      <Image
        src="/socials/viber-icon.svg"
        alt="Viber icon"
        height={16}
        width={16}
        unoptimized
      />
    ),
    name: "Viber",
  },
};

export const communicationIcons: Record<string, PreferenceItem> = {
  sms: {
    icon: <MessageSquareMore className="h-4 w-4" />,
    name: "SMS",
  },
  email: {
    icon: <Mails className="h-4 w-4" />,
    name: "Email",
  },
};

export const systemCommunicationIcons: Record<string, PreferenceItem> = {
  teleconsult: {
    icon: <Video className="h-4 w-4" />,
    name: "Teleconsult",
  },
  system: {
    icon: <AppLogo height={14} width={14} type="logoOnly" />,
    name: "System",
  },
};
