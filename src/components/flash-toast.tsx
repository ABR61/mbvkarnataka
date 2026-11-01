"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { FLASHES, type Flash } from "@/lib/flash";


// Server actions redirect after create/update/delete, which unmounts the form,
// so the confirmation travels in the URL (?flash=saved). This shows it as a
// toast once, then strips the parameter so a refresh doesn't repeat it.
export function FlashToast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("Common");
  const shown = useRef<string | null>(null);

  const flash = params.get("flash");

  useEffect(() => {
    if (!flash || !(FLASHES as readonly string[]).includes(flash)) return;
    const key = `${pathname}?${params.toString()}`;
    if (shown.current === key) return;
    shown.current = key;

    toast(t(`flash_${flash as Flash}`), "success");

    const rest = new URLSearchParams(params.toString());
    rest.delete("flash");
    const qs = rest.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [flash, params, pathname, router, toast, t]);

  return null;
}
