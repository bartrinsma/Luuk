import type { Metadata } from "next";
import { HuizenClient } from "./HuizenClient";

export const metadata: Metadata = { title: "Huizen — Luuk.si", description: "WOZ-waarde, maandlasten en Luuk's verdict voor elk Nederlands adres." };

export default async function HuizenPage({ searchParams }: PageProps<"/huizen">) {
  const { q } = await searchParams;
  return <HuizenClient initialQuery={typeof q === "string" ? q : ""} />;
}
