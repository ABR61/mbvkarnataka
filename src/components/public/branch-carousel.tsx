"use client";

import { useEffect, useState } from "react";

export type BranchSlide = {
  id: string;
  imageUrl: string;
  title: string;
  body: string;
  district: string;
  date: string;
};

// The branch pictures are split into two sets that rotate in different parts of
// the day (viewer's local time, 24h clock):
//  • 9 AM–3 PM  → the "day" set (the newer half of the pictures)
//  • otherwise  → the "off" set (the rest)
// Both rotate one picture every 5 seconds.
const ROTATE_START_HOUR = 9; // 9 AM
const ROTATE_END_HOUR = 15; // 3 PM
const ROTATE_MS = 3000;

function isDayWindow(): boolean {
  const hour = new Date().getHours();
  return hour >= ROTATE_START_HOUR && hour < ROTATE_END_HOUR;
}

/**
 * Full-width auto-rotating carousel of branch photos. Shows the "day" set during
 * 9 AM–3 PM and switches to the "off" set after 3 PM, each advancing one picture
 * every 5s, with prev/next arrows and clickable dots.
 */
export function BranchCarousel({ slides }: { slides: BranchSlide[] }) {
  // With enough pictures, split them: newer half rotates during the day window,
  // the rest after. With just a few, rotate all of them together in both windows.
  const mid = Math.ceil(slides.length / 2);
  const useSplit = slides.length >= 4;
  const daySet = useSplit ? slides.slice(0, mid) : slides;
  const offSet = useSplit ? slides.slice(mid) : slides;

  // Start in the "day" set for a deterministic first render (no hydration
  // mismatch); a mount effect immediately corrects it to the real local time.
  const [phase, setPhase] = useState<"day" | "off">("day");
  const [i, setI] = useState(0);

  const active = phase === "day" ? daySet : offSet;
  const list = active.length > 0 ? active : slides; // fallback if a half is empty
  const n = list.length;

  // Re-evaluate which set is active on mount and once a minute, so it switches
  // sets when the clock crosses 9 AM / 3 PM while the page is open.
  useEffect(() => {
    const evaluate = () => setPhase(isDayWindow() ? "day" : "off");
    evaluate();
    const timer = setInterval(evaluate, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Restart at the first picture whenever the active set switches.
  useEffect(() => setI(0), [phase]);

  // Advance one picture every 5s within the active set — always automatic.
  useEffect(() => {
    if (n <= 1) return;
    const timer = setInterval(() => setI((p) => (p + 1) % n), ROTATE_MS);
    return () => clearInterval(timer);
  }, [n, phase]);

  if (slides.length === 0) return null;
  const safeI = i % n;
  const go = (d: number) => setI((p) => (p + d + n) % n);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm dark:border-gray-800">
      <div className="relative h-80 w-full sm:h-[520px] lg:h-[620px]">
        {list.map((s, idx) => (
          <figure
            key={`${phase}-${s.id}`}
            className={`absolute inset-0 transition-opacity duration-300 ${
              idx === safeI ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.imageUrl} alt={s.title} className="h-full w-full object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-left text-white sm:p-7">
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                {s.district}
              </span>
              <h3 className="mt-1 text-lg font-bold sm:text-2xl">{s.title}</h3>
              <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-gray-200">
                {s.body}
              </p>
              <time className="mt-2 block text-xs text-gray-300">{s.date}</time>
            </figcaption>
          </figure>
        ))}
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/70"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/70"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {list.map((s, idx) => (
              <button
                key={`${phase}-dot-${s.id}`}
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === safeI ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
