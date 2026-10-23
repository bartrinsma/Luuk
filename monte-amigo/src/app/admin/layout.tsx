import type { Metadata } from "next";
import "./admin.css";
import "../calendar.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s – Admin Monte Amigo" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}
