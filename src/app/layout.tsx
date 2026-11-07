import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8078"),
  title: {
    default: "Auditix — Compliance, without the busywork",
    template: "%s · Auditix",
  },
  description:
    "A modern compliance workspace for policies, risk, evidence and audit readiness. Map ISO 27001 and Cyber Essentials once, then prove it everywhere.",
  icons: {
    icon: "/brand/auditix-favicon.svg",
  },
  openGraph: {
    title: "Auditix — Compliance, without the busywork",
    description: "Policies, risks and evidence in one workspace, mapped across every framework in scope.",
    images: ["/brand/auditix-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#080e21",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
