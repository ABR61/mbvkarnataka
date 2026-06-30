import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { localized } from "@/lib/localized";
import { districtOptions } from "@/lib/options";
import { PostForm } from "../post-form";
import { createPost } from "../actions";

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("post.manage");
  const t = await getTranslations("Posts");

  // Branch admin: district is fixed to theirs. Super admin: choose a district.
  const scope = scopedDistrictId(session);
  const fixed = scope
    ? await prisma.district.findUnique({ where: { id: scope } })
    : null;
  const districts = scope ? undefined : await districtOptions(locale);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <PostForm
        locale={locale}
        action={createPost}
        districts={districts}
        fixedDistrictName={fixed ? localized(fixed.name, locale) : undefined}
      />
    </div>
  );
}
