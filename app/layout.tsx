import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const sans = localFont({
  src: [
    { path: "./fonts/Carlito-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Carlito-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-sans",
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
  },
  openGraph: {
    title: "Sanjivani",
    description:
      "Campaigns, teams, chat, and fund tracking for NGOs — verified volunteer history for everyone.",
    siteName: "Sanjivani",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
