import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://monte-amigo.nl"),
  title: { default: "Monte Amigo – Cumbre del Sol", template: "%s – Monte Amigo – Cumbre del Sol" },
  icons: { icon: "/img/logo.jpg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap"
        />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
