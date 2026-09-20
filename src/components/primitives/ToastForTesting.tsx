import { toast } from "sonner";

// For devs usage only

export default function ToastForTesting(data: unknown) {
  toast("You submitted the following values:", {
    description: (
      <pre className="bg-code text-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4">
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    ),
    position: "top-right",
    classNames: {
      content: "flex flex-col gap-2",
    },
    closeButton: true,
    style: {
      "--border-radius": "calc(var(--radius)  + 4px)",
    } as React.CSSProperties,
  });
}
