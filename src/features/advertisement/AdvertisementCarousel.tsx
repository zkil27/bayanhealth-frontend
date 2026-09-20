"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Megaphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { EmblaCarouselType } from "embla-carousel";
import { Advertisement } from "./types/advertisment.types";

interface AdvertisementCarouselProps {
  ads: Advertisement[];
  title?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
}

export function AdvertisementCarousel({ 
  ads, 
  title = "Sponsored | Partners",
}: AdvertisementCarouselProps) {
  const [api, setApi] = useState<EmblaCarouselType | undefined>();
  const hasMultipleAds = ads.length >= 2;

  useEffect(() => {
    if (!api || !hasMultipleAds) return;
    const interval = setInterval(() => {
      api.scrollNext();
    }, 6000);
    return () => clearInterval(interval);
  }, [api, hasMultipleAds]);


  useEffect(() => {
    if (!api) return;
    api.on("select", () => {
      // track selection if needed
    });
  }, [api]);

  return (
    <div className="mx-auto w-full max-w-sm md:max-w-none select-none p-4">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      </div>

      <Carousel 
        setApi={setApi}
        opts={{ 
          align: "start", 
          loop: hasMultipleAds,
        }}
        className="relative"
      >
        <CarouselContent className="-ml-3 p-2">
          {ads.map((ad) => (
            <CarouselItem
              key={ad.id}
              className="basis-[85%] pl-3 xl:basis-[55%]"
            >
              <div className="group relative flex h-52 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md">

                <Link href={ad.link || "#"} className="relative block overflow-hidden bg-muted">
                  <div className="relative aspect-video w-full">
                    {ad.imageUrl ? (
                      <Image
                        src={ad.imageUrl}
                        alt={ad.imageAlt || ad.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-linear-to-br from-muted to-muted">
                        <Megaphone className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex flex-col gap-2 p-2">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {ad.description}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      {ad.businessLogo ? (
                        <div className="relative h-3 w-3 shrink-0 overflow-hidden rounded-full">
                          <Image
                            src={ad.businessLogo}
                            alt={ad.businessName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-4 w-4 shrink-0 rounded-full bg-muted" />
                      )}
                      <span className="truncate text-[8px] text-muted-foreground">
                        AD with <span className="font-medium text-foreground">{ad.businessName}</span>
                      </span>
                    </div>
                    
                    {ad.ctaText && ad.link && (
                      <Link 
                        href={ad.link}
                        className="shrink-0 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        {ad.ctaText} →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
      </Carousel>

      {/* {hasMultipleAds && (
        <div className="mt-4 flex justify-center gap-1.5">
          {ads.map((_, index) => (
            <button
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === current 
                  ? "w-4 bg-foreground" 
                  : "w-1.5 bg-muted"
              )}
              onClick={() => api?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )} */}
    </div>
  );
}