"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, CircleAlertIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ position = "top-right", ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  useEffect(() => {
    const handleToastClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      // Check if click was inside a toast card
      const toastElement = target.closest<HTMLElement>("[data-sonner-toast]")
      if (!toastElement) return

      // Don't auto-dismiss if clicking an explicit interactive control (e.g. action buttons, links)
      if (target.closest("button:not([data-close-button]), a, input, textarea")) return

      // Instantly dismiss the clicked toast
      const closeBtn = toastElement.querySelector<HTMLButtonElement>("[data-close-button]")
      if (closeBtn) {
        closeBtn.click()
      } else {
        toast.dismiss()
      }
    }

    document.addEventListener("click", handleToastClick)
    return () => document.removeEventListener("click", handleToastClick)
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={position}
      closeButton
      swipeDirections={[]}
      richColors
      duration={5000}
      gap={12}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-5 shrink-0 text-inherit" />
        ),
        info: (
          <InfoIcon className="size-5 shrink-0 text-inherit" />
        ),
        warning: (
          <TriangleAlertIcon className="size-5 shrink-0 text-inherit" />
        ),
        error: (
          <CircleAlertIcon className="size-5 shrink-0 text-inherit" />
        ),
        loading: (
          <Loader2Icon className="size-5 shrink-0 animate-spin text-inherit" />
        ),
      }}
      style={
        {
          "--width": "460px",
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "16px",
          "--error-bg": "var(--danger-bg)",
          "--error-border": "var(--danger-border)",
          "--error-text": "var(--danger-fg)",
          "--success-bg": "var(--status-available-bg)",
          "--success-border": "var(--teal-600)",
          "--success-text": "var(--status-available-fg)",
          "--warning-bg": "var(--status-soon-bg)",
          "--warning-border": "var(--gold-600)",
          "--warning-text": "var(--status-soon-fg)",
          "--info-bg": "var(--surface-brand-soft)",
          "--info-border": "var(--border-brand)",
          "--info-text": "var(--surface-brand)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast group font-sans text-sm sm:text-[15px] leading-snug font-medium p-4 sm:p-4.5 rounded-2xl shadow-xl border-2 transition-all w-full sm:w-[460px] max-w-[94vw] flex items-start gap-3 relative cursor-pointer select-none hover:opacity-95 active:scale-[0.99]",
          content: "flex flex-col gap-0.5 min-w-0 flex-1 pt-0.5",
          title: "font-semibold text-sm sm:text-[15px] leading-snug tracking-tight text-inherit",
          description: "text-xs sm:text-sm font-medium leading-relaxed text-inherit opacity-90",
          icon: "!size-5 !h-5 !w-5 shrink-0 self-start mt-0.5 text-inherit flex items-center justify-center",
          closeButton: "!hidden",
          actionButton:
            "bg-(--action-primary) text-(--action-primary-text) text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-(--action-primary-hover)",
          cancelButton:
            "bg-(--surface-warm) text-(--text-body) text-xs px-3 py-1.5 rounded-lg border border-(--border-subtle)",
          error:
            "!bg-(--danger-bg) dark:!bg-[#3a1f1f] !border-2 !border-(--danger-border) dark:!border-[#e79a9a] !text-(--danger-fg) dark:!text-[#fca5a5] [&_[data-title]]:!text-(--danger-fg) dark:[&_[data-title]]:!text-[#fca5a5] [&_[data-description]]:!text-(--danger-fg) dark:[&_[data-description]]:!text-[#fca5a5] [&_[data-icon]]:!text-(--danger-fg) dark:[&_[data-icon]]:!text-[#fca5a5] shadow-lg shadow-red-950/15",
          success:
            "!bg-(--status-available-bg) dark:!bg-[#0f2e28] !border-2 !border-(--teal-600) dark:!border-(--teal-400) !text-(--status-available-fg) dark:!text-(--teal-200) [&_[data-title]]:!text-(--status-available-fg) dark:[&_[data-title]]:!text-(--teal-200) [&_[data-description]]:!text-(--status-available-fg) dark:[&_[data-description]]:!text-(--teal-200) [&_[data-icon]]:!text-(--teal-700) dark:[&_[data-icon]]:!text-(--teal-300) shadow-lg shadow-teal-950/15",
          warning:
            "!bg-(--status-soon-bg) dark:!bg-[#36270e] !border-2 !border-(--gold-600) dark:!border-(--gold-400) !text-(--status-soon-fg) dark:!text-(--gold-200) [&_[data-title]]:!text-(--status-soon-fg) dark:[&_[data-title]]:!text-(--gold-200) [&_[data-description]]:!text-(--status-soon-fg) dark:[&_[data-description]]:!text-(--gold-200) [&_[data-icon]]:!text-(--gold-700) dark:[&_[data-icon]]:!text-(--gold-300) shadow-lg shadow-amber-950/15",
          info:
            "!bg-(--surface-brand-soft) dark:!bg-[#0c2235] !border-2 !border-(--border-brand) dark:!border-(--navy-300) !text-(--surface-brand) dark:!text-(--navy-100) [&_[data-title]]:!text-(--surface-brand) dark:[&_[data-title]]:!text-(--navy-100) [&_[data-description]]:!text-(--surface-brand) dark:[&_[data-description]]:!text-(--navy-100) [&_[data-icon]]:!text-(--navy-700) dark:[&_[data-icon]]:!text-(--navy-300) shadow-lg shadow-navy-950/15",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
