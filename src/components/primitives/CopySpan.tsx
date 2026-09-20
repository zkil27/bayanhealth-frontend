import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

// A clickable primitive span object to copy the text.
// example: copying patient's number

export function CopySpan({
  leadingText,
  text,
}: {
  leadingText?: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <p className="flex items-center gap-2">
      {leadingText}
      <span
        onClick={handleCopy}
        className="inline-flex cursor-pointer items-center gap-2 transition-transform duration-150"
      >
        {text}
        <span className="relative h-3.5 w-3.5">
          <Copy
            className={cn(
              "absolute inset-0 h-full w-full text-secondary transition-all duration-200 hover:scale-105 active:scale-95",
              copied ? "scale-0 opacity-0" : "scale-100 opacity-100",
            )}
          />
          <Check
            className={cn(
              "absolute inset-0 h-full w-full text-primary transition-all duration-200",
              copied ? "scale-100 opacity-100" : "scale-0 opacity-0",
            )}
          />
        </span>
      </span>
    </p>
  );
}
