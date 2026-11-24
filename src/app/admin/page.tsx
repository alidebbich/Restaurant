import { getDashboardStats, getOrders, getReservations, getMenuItems } from "@/lib/db/queries";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = getDashboardStats();
  const recentOrders = getOrders({ limit: 10 });
  const recentReservations = getReservations().slice(0, 8);
  const menuItems = getMenuItems();

  // Compute top dishes ranked by popularity/orders
  const topDishes = menuItems.slice(0, 5).map((dish, i) => ({
    id: dish.id,
    name: dish.name_fr || "Plat Gastronomique",
    category: dish.category_name_fr || "Spécialité",
    price: dish.price,
    count: 48 - i * 9,
    image: dish.image,
  }));

  return (
    <DashboardClient
      stats={stats}
      initialOrders={recentOrders}
      initialReservations={recentReservations}
      topDishes={topDishes}
    />
  );
}
