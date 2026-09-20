import { AppHeader } from "@/components/blocks/header/header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-satin relative flex min-h-dvh flex-col overflow-y-auto">
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

      <AppHeader className="border-transparent bg-transparent backdrop-blur-none" />
      <div className="relative flex w-full flex-1 flex-col justify-end sm:justify-center items-center px-0 sm:px-4 pb-0 sm:py-10">
        {children}
      </div>
    </div>
  );
}
