import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { RejectionSafetyNet } from "@/components/RejectionSafetyNet";

/**
 * Sanjivani type system (warm-community identity):
 * - Display: Fraunces (soft humanist serif) for hero and section heads —
 *   the editorial warmth of an NGO annual report, not a SaaS landing page
 * - Body/UI: Albert Sans (humanist, friendly for non-technical staff)
 * - Mono: system stack, reserved for real code snippets only
 * All faces are bundled locally (woff2) — zero network dependency.
 */
const display = localFont({
  src: [
    { path: "./fonts/Fraunces-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Fraunces-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Fraunces-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

const body = localFont({
  src: [
    { path: "./fonts/AlbertSans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/AlbertSans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/AlbertSans-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/AlbertSans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sanjivani — Run campaigns, grow communities",
    template: "%s · Sanjivani",
  },
  description:
    "Sanjivani is a one-stop platform for NGOs to manage campaigns, teams, communication, and fund tracking — while volunteers build a verified, portable history of their community work.",
  keywords: ["Sanjivani", "NGO", "volunteers", "campaigns", "community", "fund tracking"],
  applicationName: "Sanjivani",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/sanjivani-icon.png" }],
  },
  openGraph: {
    title: "Sanjivani",
    description:
      "Campaigns, teams, chat, and fund tracking for NGOs — verified volunteer history for everyone.",
    siteName: "Sanjivani",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F2E5" },
    { media: "(prefers-color-scheme: dark)", color: "#171410" },
  ],
};

/**
 * Dark/light bootstrap (Sanjivani_Spec.md §3) — runs before hydration so
 * the first paint already carries the right theme. Stored `theme` key
 * wins; otherwise the system preference decides.
 */
const themeBootstrap = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        className={`${display.variable} ${body.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {/* rag-paper tooth over the whole canvas (see .paper-grain) */}
        <div className="paper-grain" aria-hidden />
        {children}
        <Toaster />
        <RejectionSafetyNet />
      </body>
    </html>
  );
}
