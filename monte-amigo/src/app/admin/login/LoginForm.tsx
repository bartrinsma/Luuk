"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="adm-form">
      {!configured && (
        <p className="adm-flash info">
          De admin staat uit. Zet de omgevingsvariabele <code className="adm-code">ADMIN_PASSWORD</code> op de server en herstart.
        </p>
      )}
      <div className="adm-field">
        <label htmlFor="password">Wachtwoord</label>
        <input id="password" name="password" type="password" required autoFocus autoComplete="current-password" disabled={!configured} />
      </div>
      {state?.error && <p className="adm-error">{state.error}</p>}
      <button type="submit" className="adm-btn block" disabled={pending || !configured}>
        {pending ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
