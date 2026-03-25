import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif-display",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arkhos",
  description: "Centro de mando personal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Arkhos",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f1e8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${dmSerifDisplay.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
