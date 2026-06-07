import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1B3D72" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
