import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="font-mono text-7xl font-black tracking-tighter text-cyan price-glow">€0</div>
      <h1 className="mt-6 text-2xl font-semibold text-ink">Deze pagina is precies niks waard.</h1>
      <p className="mt-3 text-muted">Ik heb overal gezocht. Hij bestaat niet. Dat zegt meer over de link dan over mij. Sí.</p>
      <Link href="/" className="mt-8 rounded-2xl bg-cyan px-5 py-3 font-semibold text-white transition-shadow hover:shadow-[0_0_30px_-4px_rgb(14_165_233/0.5)]">
        Terug naar Luuk
      </Link>
    </div>
  );
}
