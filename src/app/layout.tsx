import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DipBuy — Systematic Dip-Buy Investing",
  description: "Track your systematic dip-buy investment strategy across indices, ETFs, and stocks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
