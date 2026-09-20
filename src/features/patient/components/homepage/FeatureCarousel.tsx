"use client";

import AppButton from "@/components/primitives/AppButton";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface PromotionItem {
  id: string | number;
  imageUrl: string;
  imageAlt?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  title: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
  overlay?: boolean;
  overlayOpacity?: number;
}

interface FeatureCarouselProps {
  items: PromotionItem[];
  carouselOptions?: {
    align?: "start" | "center" | "end";
    loop?: boolean;
  };
  showNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  cardClassName?: string;
}

export function FeatureCarousel({
  items,
  carouselOptions = { align: "start", loop: false },
  showNavigation = true,
  className = "",
  itemClassName = "basis-2/3 lg:basis-1/2",
  cardClassName = "",
}: FeatureCarouselProps) {
  return (
    <div
      className={`flex w-full flex-col justify-start gap-y-2 select-none ${className}`}
    >
      <div>
        <h1 className="text-2xl font-bold">Explore Our App!</h1>
      </div>
      <Carousel opts={carouselOptions} className="w-full">
        <CarouselContent className="-mr-16">
          {items.map((item) => (
            <CarouselItem key={item.id} className={itemClassName}>
              <div className="p-1">
                <Card
                  className={`relative mx-auto w-full max-w-sm pt-0 ${cardClassName}`}
                >
                  <div className="relative aspect-video w-full overflow-hidden">
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt || item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="z-20 object-cover brightness-80 dark:brightness-40"
                      loading="eager"
                    />
                  </div>

                  <CardHeader>
                    <CardTitle className="flex justify-between">
                      {item.title}
                      <Badge variant={item.badgeVariant || "default"}>
                        {item.badge}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>

                  <CardFooter>
                    <AppButton className="w-full" onClick={item.onCtaClick}>
                      {item.ctaText || "View Event"}
                    </AppButton>
                  </CardFooter>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {showNavigation && items.length > 1 && (
          <>
            <CarouselNext className="right-0 bg-primary text-white shadow-lg transition-all duration-300 active:shadow-none" />
          </>
        )}
      </Carousel>
    </div>
  );
}