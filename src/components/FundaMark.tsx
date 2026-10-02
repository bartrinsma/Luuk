/**
 * Klein, herkenbaar Funda-merkteken (oranje huisje + woordmerk) als verwijzing naar de bron.
 * Geen kopie van het officiële logo; vervang desgewenst door het officiële merkmateriaal van Funda.
 */
export function FundaIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#F7A100" />
      <path d="M5.5 12.2 12 6.5l6.5 5.7V18a.8.8 0 0 1-.8.8h-3.4v-4.2h-4.6v4.2H6.3a.8.8 0 0 1-.8-.8z" fill="#fff" />
    </svg>
  );
}

export function FundaMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <FundaIcon className="h-4 w-4" />
      <span className="text-[13px] font-extrabold lowercase tracking-tight text-[#E68A00]">funda</span>
    </span>
  );
}
