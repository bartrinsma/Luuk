import type { Metadata } from "next";
import { RoastClient } from "./RoastClient";

export const metadata: Metadata = { title: "Website Roast — Luuk.si", description: "Laadtijd, mobiele score en SEO. Luuk vertelt je hard en eerlijk waar je site lekt." };

export default async function RoastPage({ searchParams }: PageProps<"/roast">) {
  const { q } = await searchParams;
  return <RoastClient initialQuery={typeof q === "string" ? q : ""} />;
}
