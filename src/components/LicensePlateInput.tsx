"use client";

import { forwardRef, useState } from "react";
import { formatKenteken } from "@/lib/validation";
import { LUUK_PLACEHOLDER, OmnibarShell, SubmitButton } from "./SearchInput";

interface LicensePlateInputProps {
  value: string;
  onValueChange: (formatted: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  autoFocus?: boolean;
}

/** Geel Nederlands kenteken met EU-strook. Streepjes worden live geformatteerd. */
export const LicensePlateInput = forwardRef<HTMLInputElement, LicensePlateInputProps>(function LicensePlateInput(
  { value, onValueChange, onSubmit, loading, autoFocus },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) onSubmit();
      }}
      className="w-full"
    >
      <OmnibarShell focused={focused}>
        <label className="flex h-16 min-w-0 flex-1 overflow-hidden rounded-2xl border-2 border-black/80 bg-plate shadow-[inset_0_-3px_0_rgb(0_0_0/0.15),0_8px_30px_-10px_rgb(247_198_0/0.5)] sm:h-[4.5rem]">
          <span className="flex w-10 shrink-0 flex-col items-center justify-end bg-eu pb-1.5 text-white sm:w-12" aria-hidden>
            <EuStars />
            <span className="mt-1 text-sm font-bold leading-none sm:text-base">NL</span>
          </span>
          <span className="sr-only">Kenteken</span>
          <input
            ref={ref}
            value={value}
            onChange={(e) => onValueChange(formatKenteken(e.target.value))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={LUUK_PLACEHOLDER}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={8}
            className="min-w-0 flex-1 bg-transparent px-3 text-center font-mono text-4xl font-black uppercase tracking-[0.12em] text-black placeholder:text-xl placeholder:font-bold placeholder:normal-case placeholder:tracking-normal placeholder:text-black/40 focus:outline-none sm:text-5xl sm:placeholder:text-2xl"
          />
        </label>
        <SubmitButton loading={loading} disabled={!value.trim()} label="Waardeer kenteken" />
      </OmnibarShell>
    </form>
  );
});

function EuStars() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={12 + Math.cos(angle) * 8} cy={12 + Math.sin(angle) * 8} r={1.25} fill="#FFCC00" />;
      })}
    </svg>
  );
}
