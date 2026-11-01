"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { SidebarLinks, type NavItem } from "@/components/admin/sidebar-links";

// Phone/tablet navigation for the admin area: a menu button (shown below the
// md breakpoint) that slides in the same links as the desktop sidebar.
export function MobileNav({
  items,
  menuLabel,
  closeLabel,
  brand,
}: {
  items: NavItem[];
  menuLabel: string;
  closeLabel: string;
  brand: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [seenPath, setSeenPath] = useState(pathname);

  // Close the drawer whenever the route changes (adjust state during render,
  // rather than in an effect, to avoid a cascading re-render).
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setOpen(false);
  }

  // Escape closes it, and the page behind must not scroll while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={menuLabel}
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200"
      >
        <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={menuLabel}>
          {/* Backdrop — tap to close */}
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white p-3 shadow-xl dark:bg-gray-950">
            <div className="mb-3 flex items-center justify-between px-3 py-2">
              <span className="text-lg font-bold text-emerald-700">{brand}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarLinks items={items} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
