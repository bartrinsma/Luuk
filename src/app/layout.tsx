import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Background } from "@/components/Background";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luuk.si — Ask Luuk? Sí!",
  description: "De super intelligente waarde-expert. Huizen, auto's en websites: Luuk weet wat het waard is.",
};

export const viewport: Viewport = {
  themeColor: "#F6F9FC",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="relative min-h-full overflow-x-hidden">
        <Background />
        <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
