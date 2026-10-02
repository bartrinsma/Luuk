import { HomeClient } from "./HomeClient";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { q } = await searchParams;
  return <HomeClient initialQuery={typeof q === "string" ? q : ""} />;
}
