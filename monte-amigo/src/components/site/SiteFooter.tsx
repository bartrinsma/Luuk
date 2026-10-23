import { CONTACT_EMAIL } from "@/lib/rates";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <a className="social" href={`mailto:${CONTACT_EMAIL}`} aria-label="Stuur ons een e-mail">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M3.5 6.5h17v11h-17z" />
            <path fill="none" stroke="currentColor" strokeWidth="1.8" d="m3.5 7 8.5 6.5L20.5 7" />
          </svg>
        </a>
        <p className="site-info">
          &copy; {new Date().getFullYear()} Monte Amigo &middot; Cumbre del Sol &middot;{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </div>
    </footer>
  );
}
