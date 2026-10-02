import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Background } from "@/components/Background";
import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/share/Toast";
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
        <div className="relative z-10 flex min-h-screen flex-col">
          <Header />
          <ToastProvider>
            <main className="flex flex-1 flex-col">{children}</main>
          </ToastProvider>
          <footer className="px-6 pb-8 pt-16 text-center text-xs text-ink/30">
            Luuk.si — indicaties, geen financieel advies. Al heeft Luuk meestal gelijk. Sí.
          </footer>
        </div>
      </body>
    </html>
  );
}
