import { getOrders } from "@/lib/db/queries";
import { OrdersClient } from "./OrdersClient";

export const dynamic = "force-dynamic";

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default async function AdminOrdersPage() {
  const orders = plain(getOrders());
  return <OrdersClient initialOrders={orders} />;
}
