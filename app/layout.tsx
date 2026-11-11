import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusBite Live",
  description: "SRM campus canteen ordering agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
