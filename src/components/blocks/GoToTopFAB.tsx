"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GoToTopFAB() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollY / height) * 100;
      
      setScrollProgress(progress);
      setIsVisible(scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
      )}
    >
      <div className="relative h-12 w-12">
        {/* Progress ring SVG */}
        <svg className="absolute h-full w-full -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-200"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - scrollProgress / 100)}`}
            className="text-primary transition-all duration-200"
          />
        </svg>
        <Button
          onClick={scrollToTop}
          size="icon"
          className="absolute inset-0 h-full w-full rounded-full bg-primary text-white shadow-lg hover:bg-primary/90"
          aria-label="Go to top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}