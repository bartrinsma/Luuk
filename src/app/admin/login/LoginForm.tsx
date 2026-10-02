"use client";

import { Loader2, Lock } from "lucide-react";
import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="panel flex w-full max-w-sm flex-col gap-4 rounded-3xl p-7">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Lock className="h-4 w-4 text-cyan-ink" /> Admin-toegang
      </div>
      {!configured && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Het admin-gedeelte staat uit. Zet de omgevingsvariabele <code className="font-mono">ADMIN_PASSWORD</code> op de server en herstart.
        </p>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">Wachtwoord</span>
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          disabled={!configured}
          className="h-11 rounded-xl border border-ink/10 bg-white px-3.5 text-ink focus:border-cyan focus:outline-none disabled:opacity-50"
        />
      </label>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || !configured}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan font-semibold text-white transition-shadow hover:shadow-[0_0_24px_-4px_rgb(14_165_233/0.5)] disabled:opacity-40"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Inloggen
      </button>
    </form>
  );
}
