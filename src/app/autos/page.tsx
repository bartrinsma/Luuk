import type { Metadata } from "next";
import { AutosClient } from "./AutosClient";

export const metadata: Metadata = { title: "Auto's — Luuk.si", description: "Kenteken erin, dagwaarde eruit. Live uit de RDW Open Data." };

export default async function AutosPage({ searchParams }: PageProps<"/autos">) {
  const { q } = await searchParams;
  return <AutosClient initialQuery={typeof q === "string" ? q : ""} />;
}
