import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SwRegistration } from "@/components/sw-registration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sorare AI - Gestisci la tua collezione",
  description:
    "Applicazione per interagire con Sorare API e gestire le tue carte collezionabili",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sorare AI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SwRegistration />
        {children}
      </body>
    </html>
  );
}
