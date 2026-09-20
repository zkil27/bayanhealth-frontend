import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import TapFeedback from "@/components/blocks/TapFeedBack";
import { SessionGuard } from "@/components/auth/SessionGuard";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

// For Typography later
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#18a58c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "BayanHealth",
  description: "To be filled",
};

/**
 * Every route renders per request so the CSP nonce can reach the HTML.
 *
 * `proxy.ts` mints a nonce per request and Next stamps it onto the inline
 * bootstrap and hydration scripts it injects. A statically prerendered page has
 * its HTML fixed at build time, so it cannot carry a per-request nonce — and
 * because `script-src` uses `strict-dynamic` (which makes browsers ignore
 * `'self'` for scripts), those unnonced inline scripts are blocked outright.
 * That is what broke sign-in on the deployed environment: `/signIn` was static
 * and served 30 scripts with 0 nonced, while the dynamic `/intake/[token]`
 * served 26 of 27 nonced and worked.
 *
 * Declared at the root layout rather than per page deliberately: a page that
 * forgets the opt-out is a page that fails closed in the browser, and that
 * failure is invisible to typecheck, unit tests, and the production build. The
 * cost is losing static prerendering, which buys little here — nearly every
 * route is authenticated and personalised, and Amplify still caches assets.
 *
 * Do not remove without also removing the nonce from `script-src` in
 * `buildContentSecurityPolicy`, or the application will not load.
 */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // `next-themes` injects a raw inline script to set the theme class before
  // first paint, and Next does not stamp the nonce onto it. Without the nonce it
  // is the one remaining script blocked by `strict-dynamic`, which would leave
  // the app rendering with no theme applied. `proxy.ts` publishes the
  // per-request nonce on `x-nonce`.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.className} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-screen w-full flex-col scroll-smooth">
        <SessionGuard />
        <TapFeedback />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
