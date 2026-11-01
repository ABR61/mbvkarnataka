import { setRequestLocale } from "next-intl/server";
import { SimpleGuide } from "@/components/simple-guide";

// How-to for trainees. Sign-in is enforced by the portal layout.
export default async function PortalHelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SimpleGuide namespace="PortalHelp" />;
}
