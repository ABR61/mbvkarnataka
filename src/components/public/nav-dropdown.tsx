"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

type Item = { href: React.ComponentProps<typeof Link>["href"]; label: string };

// A nav item that reveals a dropdown of sub-links. Click-driven: opens on click,
// closes when a link is chosen, when clicking outside, or on Escape.
export function NavDropdown({ label, items }: { label: string; items: Item[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1 hover:text-emerald-700"
      >
        {label}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-44 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950"
        >
          {items.map((it) => (
            <Link
              key={it.label}
              href={it.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
