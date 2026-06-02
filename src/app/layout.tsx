import type { Metadata } from "next";
import { Inter, Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Aura Veritas | Enterprise Checklist Builder & Compliance Engine",
  description: "Dynamic Word-parsed audit checklist builder with offline PWA support, schema-driven form rendering, table grids, KPI analytics, and PDF report compilation.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="theme-color" content="#1B3D72" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
