import { getCategories } from "@/lib/db/queries";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default async function AdminCategoriesPage() {
  const categories = plain(getCategories(true));
  return <CategoriesClient initialCategories={categories} />;
}
