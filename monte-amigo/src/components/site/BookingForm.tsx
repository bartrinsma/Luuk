"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitReservation } from "@/app/(site)/reserveren/actions";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { addDays, isoDate, nightsBetween, niceDate, parseDate, rangeFree, today, type Range } from "@/lib/dates";
import { useToday } from "@/lib/useClient";
import { CONTACT_EMAIL, MAX_GUESTS, MAX_NIGHTS, MIN_NIGHTS, euro, priceFor } from "@/lib/rates";

interface Props {
  ranges: Range[];
  initialArrival?: string;
  initialDeparture?: string;
}

function checkDates(a: Date | null, b: Date | null, ranges: Range[]) {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  const tomorrow = addDays(today(), 1);

  if (!a) errors.aankomst = "Kies een aankomstdatum.";
  else if (a < tomorrow) errors.aankomst = "De aankomstdatum moet in de toekomst liggen.";
  if (!b) errors.vertrek = "Kies een vertrekdatum.";
  else if (a && b <= a) errors.vertrek = "De vertrekdatum moet na de aankomstdatum liggen.";

  if (a && b && b > a && !errors.aankomst) {
    const n = nightsBetween(a, b);
    if (n < MIN_NIGHTS) errors.vertrek = `Het minimale verblijf is ${MIN_NIGHTS} nachten.`;
    else if (!rangeFree(a, b, ranges)) {
      errors.vertrek = "Het appartement is in (een deel van) deze periode al bezet. Bekijk de kalender hierboven.";
    }
    if (n > MAX_NIGHTS) {
      warnings.push(
        `Het maximale verblijf is in principe ${MAX_NIGHTS} nachten. Langer blijven? Vermeld het in de toelichting, dan nemen we contact met je op.`,
      );
    }
    const summer = (d: Date) => d.getMonth() === 6 || d.getMonth() === 7;
    if ((summer(a) || summer(addDays(b, -1))) && (a.getDay() !== 6 || b.getDay() !== 6)) {
      warnings.push(
        "In juli en augustus loopt het verblijf in principe van zaterdag tot zaterdag. In overleg zijn andere aankomst- en vertrekdagen mogelijk.",
      );
    }
  }
  return { errors, warnings };
}

export function BookingForm({ ranges, initialArrival = "", initialDeparture = "" }: Props) {
  const [state, formAction, pending] = useActionState(submitReservation, undefined);
  const [arrival, setArrival] = useState(parseDate(initialArrival) ? initialArrival : "");
  const [departure, setDeparture] = useState(parseDate(initialDeparture) ? initialDeparture : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const a = parseDate(arrival);
  const b = parseDate(departure);

  const now = useToday();
  const tomorrow = now ? addDays(now, 1) : null;
  const minDates = {
    arrival: tomorrow ? isoDate(tomorrow) : "",
    departure: tomorrow ? isoDate(addDays(tomorrow, MIN_NIGHTS)) : "",
  };

  // Foutmeldingen van de server overnemen; na succes de datums leegmaken.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.fieldErrors) setErrors(state.fieldErrors);
    if (state?.ok) {
      setArrival("");
      setDeparture("");
      setErrors({});
    }
  }

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
    if (state?.ok || state?.error) statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  const clear = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
  const fieldCls = (k: string) => `field${errors[k] ? " has-error" : ""}`;
  const err = (k: string) => (
    <p className="err" role="alert">
      {errors[k]}
    </p>
  );

  function validate(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    const fe: Record<string, string> = {};
    if (String(fd.get("naam")).trim().length < 2) fe.naam = "Vul je naam in.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(fd.get("email")).trim())) fe.email = "Vul een geldig e-mailadres in.";
    if (!/^\+?\d{8,15}$/.test(String(fd.get("telefoon")).replace(/[\s\-().]/g, ""))) {
      fe.telefoon = "Vul een geldig telefoonnummer in, bijv. +31 6 12345678.";
    }
    if (!fd.get("gasten")) fe.gasten = "Kies het aantal gasten.";
    Object.assign(fe, checkDates(a, b, ranges).errors);

    if (Object.keys(fe).length) {
      e.preventDefault();
      setErrors(fe);
      const first = Object.keys(fe)[0];
      (e.currentTarget.elements.namedItem(first) as HTMLElement | null)?.focus();
    }
  }

  const check = a && b && b > a ? checkDates(a, b, ranges) : null;
  const price = check && !check.errors.aankomst && !check.errors.vertrek ? priceFor(a!, b!) : null;

  return (
    <form ref={formRef} action={formAction} onSubmit={validate} className="booking-form" noValidate>
      <div className={fieldCls("naam")}>
        <label htmlFor="naam">
          Naam <span className="req" aria-hidden="true">*</span>
        </label>
        <input id="naam" name="naam" type="text" autoComplete="name" required onInput={() => clear("naam")} />
        {err("naam")}
      </div>
      <div className="field-row">
        <div className={fieldCls("email")}>
          <label htmlFor="email">
            E-mailadres <span className="req" aria-hidden="true">*</span>
          </label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required onInput={() => clear("email")} />
          {err("email")}
        </div>
        <div className={fieldCls("telefoon")}>
          <label htmlFor="telefoon">
            Telefoonnummer <span className="req" aria-hidden="true">*</span>
          </label>
          <input id="telefoon" name="telefoon" type="tel" autoComplete="tel" inputMode="tel" required onInput={() => clear("telefoon")} />
          {err("telefoon")}
        </div>
      </div>
      <div className={fieldCls("gasten")}>
        <label htmlFor="gasten">
          Aantal gasten <span className="req" aria-hidden="true">*</span>
        </label>
        <select id="gasten" name="gasten" required defaultValue="" onChange={() => clear("gasten")}>
          <option value="">Kies…</option>
          {Array.from({ length: MAX_GUESTS }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "persoon" : "personen"}
            </option>
          ))}
        </select>
        {err("gasten")}
      </div>

      <div className="booking-calendar" aria-label="Beschikbaarheid: klik op je aankomst- en vertrekdatum">
        <AvailabilityCalendar
          ranges={ranges}
          months={2}
          start={a}
          end={b && a && b > a ? b : null}
          onSelect={(s, e) => {
            setArrival(s ? isoDate(s) : "");
            setDeparture(e ? isoDate(e) : "");
            clear("aankomst");
            clear("vertrek");
          }}
        />
      </div>

      <div className="field-row">
        <div className={fieldCls("aankomst")}>
          <label htmlFor="aankomst">
            Aankomstdatum <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="aankomst"
            name="aankomst"
            type="date"
            required
            min={minDates.arrival}
            value={arrival}
            onChange={(e) => {
              setArrival(e.target.value);
              clear("aankomst");
            }}
          />
          {err("aankomst")}
        </div>
        <div className={fieldCls("vertrek")}>
          <label htmlFor="vertrek">
            Vertrekdatum <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="vertrek"
            name="vertrek"
            type="date"
            required
            min={a ? isoDate(addDays(a, MIN_NIGHTS)) : minDates.departure}
            value={departure}
            onChange={(e) => {
              setDeparture(e.target.value);
              clear("vertrek");
            }}
          />
          {err("vertrek")}
        </div>
      </div>

      {check && (
        <div className="summary" aria-live="polite">
          <dl>
            <dt>Aankomst</dt>
            <dd>{niceDate(a!)}</dd>
            <dt>Vertrek</dt>
            <dd>{niceDate(b!)}</dd>
            <dt>Aantal nachten</dt>
            <dd>{nightsBetween(a!, b!)}</dd>
            {price && (
              <>
                <dt>Verblijf</dt>
                <dd>{euro(price.stay)}</dd>
                <dt>Schoonmaakkosten</dt>
                <dd>{euro(price.cleaning)}</dd>
                <dt className="total">Totaal (indicatie)</dt>
                <dd className="total">{euro(price.total)}</dd>
              </>
            )}
          </dl>
          {price && (
            <p className="small">
              Exclusief {euro(price.deposit)} borg, die je na afloop terugkrijgt. De definitieve prijs ontvang je bij de bevestiging.
            </p>
          )}
          {Object.values(check.errors).map((m) => (
            <p key={m} className="notice error">
              {m}
            </p>
          ))}
          {check.warnings.map((w) => (
            <p key={w} className="notice warn">
              {w}
            </p>
          ))}
        </div>
      )}

      <div className="field">
        <label htmlFor="toelichting">Toelichting</label>
        <textarea
          id="toelichting"
          name="toelichting"
          rows={5}
          placeholder="Bijvoorbeeld: kinderbedje of kinderstoel gewenst, verwachte aankomsttijd, vragen…"
        />
      </div>

      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Laat dit veld leeg</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Bezig met versturen…" : "Verstuur je formulier"}
      </button>
      <div
        ref={statusRef}
        className={`form-status${state?.ok ? " is-visible ok" : state?.error ? " is-visible fail" : ""}`}
        role="status"
      >
        {state?.ok && (
          <>
            <strong>Bedankt{state.name ? `, ${state.name}` : ""}!</strong> Je aanvraag is verstuurd. We nemen zo snel mogelijk
            contact met je op om je reservering te bevestigen.
          </>
        )}
        {state?.error && (
          <>
            {state.error} Je kunt ook mailen naar <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </>
        )}
      </div>
    </form>
  );
}
