export function Stars({ n }: { n: number }) {
  return (
    <span className="stars" role="img" aria-label={`${n} van de 5 sterren`}>
      {"★".repeat(n)}
      {n < 5 && <span className="off">{"★".repeat(5 - n)}</span>}
    </span>
  );
}
