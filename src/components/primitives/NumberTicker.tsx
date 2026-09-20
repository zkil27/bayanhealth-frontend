import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  className?: string;
}

// A primitive number ticker animation for real time changing of numbers
// example: Doctor's pending intake boards current total intakes that is constantly changing


export function NumberTicker({ value, className }: NumberTickerProps) {
  // Grouped thousands, so a peso total reads "48,200" rather than "48200".
  // Separators fall through the non-digit branch below and render as static
  // characters, so they cost the roll animation nothing. Counts under a
  // thousand — every other caller — are unaffected.
  const digits = Array.from(value.toLocaleString("en-US"));

  return (
    <span
      className={cn(
        "inline-flex overflow-hidden font-mono select-none h-[1.5em] items-center text-current",
        className
      )}
    >
      {digits.map((char, idx) => {
        const isNumber = !isNaN(Number(char)) && char !== " ";
        const digit = isNumber ? Number(char) : 0;

        if (!isNumber) {
          // Separators sit tight against the digits either side. They used to
          // carry 0.1em of padding on both flanks, which rendered a grouped
          // total as "48 , 200".
          return (
            <span key={`char-${idx}`} className="inline-block">
              {char}
            </span>
          );
        }

        return (
          <span
            key={`col-${digits.length - idx}`}
            className="relative inline-block w-[0.65em] h-[1.5em] overflow-hidden"
            style={{ "--digit": digit } as React.CSSProperties}
          >
            <span 
              className="absolute left-0 top-0 flex w-full flex-col h-[15em]"
              style={{
                transform: "translateY(calc(var(--digit) * -1.5em))",
                transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <span
                  key={num}
                  className="h-[1.5em] w-full flex items-center justify-center leading-none"
                >
                  {num}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}