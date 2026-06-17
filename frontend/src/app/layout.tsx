import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/providers/Providers";

const jakartaSans = Plus_Jakarta_Sans({
  subsets:  ["latin"],
  variable: "--font-display",
  weight:   ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-body",
  weight:   ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PawCare — AI-Powered Cat Monitoring",
  description: "Real-time AI monitoring, behavior tracking and smart automation for your cat.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakartaSans.variable} ${inter.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}