import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

// A short titled list of "what's here and how to use it" items, read from a
// message namespace shaped { title, intro, items: [{ title, body }] }.
// Used for the trainee-portal and trainer-area how-to pages.
export async function SimpleGuide({ namespace }: { namespace: "PortalHelp" | "TrainerHelp" }) {
  const t = await getTranslations(namespace);
  const items = t.raw("items") as { title: string; body: string }[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <Card key={i}>
            <h2 className="text-base font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
