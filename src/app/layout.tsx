import type { Metadata, Viewport } from "next";
import { Fraunces, Huninn } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

// 標題用粉圓體（圓圓的中文），大數字用 Fraunces（柔和的襯線體），內文用系統字（蘋方）
const huninn = Huninn({ weight: "400", subsets: ["latin"], variable: "--font-huninn", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], axes: ["SOFT", "opsz"], variable: "--font-fraunces", display: "swap" });

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
  themeColor: "#f6efe4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${huninn.variable} ${fraunces.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
