"use client";

import { ArrowRight, Loader2, Sparkles, type LucideIcon } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";

export const LUUK_PLACEHOLDER = "Ask Luuk? Sí!";

/** Zwevende glass-container met focus-glow. Basis voor elke Omnibar-variant. */
export function OmnibarShell({ children, focused, className = "" }: { children: ReactNode; focused: boolean; className?: string }) {
  return (
    <div className={`relative w-full ${className}`}>
      <div
        aria-hidden
        className={`pointer-events-none absolute -inset-3 rounded-[2rem] bg-[radial-gradient(60%_120%_at_50%_50%,rgb(14_165_233/0.35),transparent_70%)] blur-2xl transition-opacity duration-500 ${
          focused ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`glass relative flex items-center gap-2 rounded-3xl p-2 transition-[border-color,box-shadow] duration-300 ${
          focused ? "border-cyan/40! shadow-[0_0_0_1px_rgb(14_165_233/0.15),0_30px_80px_-20px_rgb(14_165_233/0.25)]" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function SubmitButton({ loading, disabled, label = "Vraag het Luuk" }: { loading?: boolean; disabled?: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-label={label}
      className="group flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-cyan px-4 font-semibold text-white transition-all hover:shadow-[0_0_30px_-4px_rgb(14_165_233/0.5)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none sm:px-5"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />}
      <span className="hidden sm:inline">{loading ? "Denkt…" : "Sí"}</span>
    </button>
  );
}

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onSubmit"> {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  icon?: LucideIcon;
  /** Extra controls links van de submitknop (bijv. modus-toggle). */
  addon?: ReactNode;
}

/** De Luuk Omnibar: één prominente, zwevende zoekbalk. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onValueChange, onSubmit, loading, icon: Icon = Sparkles, addon, placeholder = LUUK_PLACEHOLDER, ...rest },
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
        <Icon className={`ml-3 h-5 w-5 shrink-0 transition-colors ${focused ? "text-cyan" : "text-muted"}`} />
        <input
          ref={ref}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="h-12 min-w-0 flex-1 bg-transparent px-2 text-lg text-ink placeholder:text-ink/35 focus:outline-none sm:text-xl"
          {...rest}
        />
        {addon}
        <SubmitButton loading={loading} disabled={!value.trim()} />
      </OmnibarShell>
    </form>
  );
});
