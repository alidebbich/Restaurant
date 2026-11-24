import { getDeletedMenuItems, getDeletedCategories } from "@/lib/db/queries";
import { TrashClient } from "./TrashClient";

export const metadata = {
  title: "Corbeille — Administration",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default function TrashPage() {
  const deletedDishes = plain(getDeletedMenuItems());
  const deletedCategories = plain(getDeletedCategories());

  return <TrashClient dishes={deletedDishes} categories={deletedCategories} />;
}

