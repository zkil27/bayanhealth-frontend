import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse motion-reduce:animate-none rounded-md bg-secondary/50 dark:bg-muted/70", className)}
      {...props}
    />
  )
}

export { Skeleton }
