import { notFound } from "next/navigation";
import { getMenuItemById, getMenuItemOptions, getCategories } from "@/lib/db/queries";
import { MenuItemForm } from "../../MenuItemForm";

export const dynamic = "force-dynamic";

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = plain(getMenuItemById(id));

  if (!item) {
    notFound();
  }

  const options = plain(getMenuItemOptions(id));
  const categories = plain(getCategories(true));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">
          Modifier le Plat : {item.name_fr}
        </h2>
        <p className="text-xs text-text-tertiary">
          Toutes les modifications sont synchronisées en temps réel.
        </p>
      </div>

      <MenuItemForm
        initialItem={{ ...item, options }}
        categories={categories}
        isEdit={true}
      />
    </div>
  );
}