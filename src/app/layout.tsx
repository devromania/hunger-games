import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Hunger Games | 50x50 Tactical Arena (Next.js + React)",
  description:
    "Interactive 50x50 Hunger Games survival strategy game built with Next.js, React, TypeScript, and Tailwind CSS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#060911] text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
