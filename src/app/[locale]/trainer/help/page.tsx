import { setRequestLocale } from "next-intl/server";
import { SimpleGuide } from "@/components/simple-guide";

// How-to for trainers. Sign-in is enforced by the trainer layout.
export default async function TrainerHelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SimpleGuide namespace="TrainerHelp" />;
}
