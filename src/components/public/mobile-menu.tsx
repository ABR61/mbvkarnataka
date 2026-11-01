"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Item = { href: React.ComponentProps<typeof Link>["href"]; label: string };

// Narrow-screen menu: a hamburger button that opens a vertical dropdown panel
// with every link. Used below the `lg` breakpoint; the inline row is used above.
export function MobileMenu({
  links,
  apply,
  auth,
  menuLabel,
}: {
  links: Item[];
  apply: Item;
  auth: {
    loggedIn: boolean;
    area: { href: Item["href"]; label: string } | null;
    signOut: {
      action: (formData: FormData) => void | Promise<void>;
      locale: string;
      label: string;
    };
    login: { href: Item["href"]; label: string };
  };
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={menuLabel}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-56 flex-col rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={close}
              className="px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={apply.href}
            onClick={close}
            className="mx-3 my-1 rounded-md bg-emerald-600 px-3 py-2 text-center font-medium text-white hover:bg-emerald-700"
          >
            {apply.label}
          </Link>
          {auth.area && (
            <Link
              href={auth.area.href}
              onClick={close}
              className="px-4 py-2 font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              {auth.area.label}
            </Link>
          )}
          {auth.loggedIn ? (
            <form action={auth.signOut.action} onSubmit={close}>
              <input type="hidden" name="locale" value={auth.signOut.locale} />
              <button
                type="submit"
                className="w-full px-4 py-2 text-left text-gray-500 hover:text-emerald-700"
              >
                {auth.signOut.label}
              </button>
            </form>
          ) : (
            <Link
              href={auth.login.href}
              onClick={close}
              className="px-4 py-2 font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              {auth.login.label}
            </Link>
          )}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 dark:border-gray-800">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}
