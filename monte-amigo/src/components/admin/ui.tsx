export function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="adm-head">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}

/** Melding na een actie (?ok=… of ?fout=… in de URL). */
export async function Flash({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const fout = typeof sp.fout === "string" ? sp.fout : null;
  if (!ok && !fout) return null;
  return (
    <p className={`adm-flash ${fout ? "fout" : "ok"}`} role="status">
      {fout ?? ok}
    </p>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    aanvraag: ["orange", "Aanvraag"],
    bevestigd: ["green", "Bevestigd"],
    geblokkeerd: ["purple", "Geblokkeerd"],
    afgewezen: ["red", "Afgewezen"],
  };
  const [color, label] = map[status] ?? ["", status];
  return (
    <span className={`badge ${color}`}>
      <span className={`dot ${color || "gray"}`} />
      {label}
    </span>
  );
}

export type SP = Promise<Record<string, string | string[] | undefined>>;
