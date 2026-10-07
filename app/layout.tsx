import type { Metadata } from "next";
import { Google_Sans_Flex } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider, Toaster } from "@/components/ui/toast";
import "./globals.css";

// Same typeface as the public site (new_world_courtage/lib/fonts.js); the
// slant axis gives emphasised words their designed italic.
const siteSans = Google_Sans_Flex({
  variable: "--font-site-sans",
  subsets: ["latin"],
  weight: "variable",
  axes: ["slnt"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "New World Courtage — CRM",
  description: "Back-office New World Courtage : leads, contacts, guides et questionnaires.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${siteSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
