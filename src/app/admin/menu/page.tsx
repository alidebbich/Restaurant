import { getMenuItems, getCategories } from "@/lib/db/queries";
import { MenuClient } from "./MenuClient";

export const dynamic = "force-dynamic";

// node:sqlite DatabaseSync rows have a custom prototype that Next.js RSC
// serialization rejects. JSON round-trip produces plain objects.
function plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export default async function AdminMenuPage() {
  const items = plain(getMenuItems());
  const categories = plain(getCategories(true));

  return <MenuClient initialItems={items} categories={categories} />;
}

