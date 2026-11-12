import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: "貓鼠日曆",
  description: "貓和鼠的共用日曆",
  applicationName: "貓鼠日曆",
  appleWebApp: { capable: true, title: "貓鼠日曆", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fbf7f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className="antialiased">
      <body className="min-h-dvh font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
