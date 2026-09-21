import { AppHeader } from "@/components/blocks/header/header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-satin relative flex h-dvh max-h-dvh w-full flex-col overflow-hidden">
      {/*
        Decorative brand shapes, peeking off the edges — purely presentational.
        Hidden below `sm`: there is no room to keep them clear of the card's
        content at narrow widths without overlapping it.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-16 hidden size-72 rounded-full border-28 border-(--surface-brand)/80 sm:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-16 bottom-40 hidden size-16 rounded-full bg-(--action-primary) sm:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -bottom-16 hidden size-48 rounded-full bg-(--action-primary) sm:block"
      />

      <AppHeader className="border-transparent bg-transparent backdrop-blur-none shrink-0 py-1 px-3 sm:py-2 sm:px-6" />
      <div className="relative flex w-full flex-1 flex-col items-center justify-center min-h-0 px-2 sm:px-4 py-1 sm:py-3 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
