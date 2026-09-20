/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function ModeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  if (!mounted) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={        <Button
          variant="outline"
          size="icon"
          className={cn(
            "z-50 h-11 w-11 rounded-full transition-all duration-150 active:scale-95",
            !open && "hover:scale-110 hover:shadow-xl",
            "bg-secondary text-secondary-foreground",
            "border border-border"
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center transition-transform duration-200",
              open ? "rotate-90" : "rotate-0"
            )}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Toggle theme</span>
          </span>
        </Button>}>

      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        sideOffset={4}
        className="z-61"
      >
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}