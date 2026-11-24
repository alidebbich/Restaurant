import { getCategories } from "@/lib/db/queries";
import { MenuItemForm } from "../MenuItemForm";

export const dynamic = "force-dynamic";

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default async function NewMenuItemPage() {
  const categories = plain(getCategories(true));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">
          Ajouter un Nouveau Plat au Menu
        </h2>
        <p className="text-xs text-text-tertiary">
          Ce plat apparaîtra immédiatement sur le menu public et le menu QR code.
        </p>
      </div>

      <MenuItemForm categories={categories} isEdit={false} />
    </div>
  );
}