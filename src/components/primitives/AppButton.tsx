import { forwardRef, type ComponentProps } from "react";
import { Button } from "@/components/ui/button"; 
import { cn } from "@/lib/utils";

// BayanHealth Button for eventual telemetries.

type AppButtonProps = ComponentProps<typeof Button>;

const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <Button 
        ref={ref} 
        className={cn("font-medium", className)} 
        {...props} 
      />
    );
  }
);

AppButton.displayName = "AppButton";

export default AppButton;