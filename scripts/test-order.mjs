import { DatabaseSync } from "node:sqlite";

try {
  const db = new DatabaseSync("data/restaurant.sqlite");
  const orderId = "ord_test_" + Date.now();
  const orderNumber = "CMD-TEST-1234";

  console.log("Testing insert orders...");
  db.prepare(`
    INSERT INTO orders (
      id, order_number, customer_name, customer_phone,
      order_type, table_or_time, delivery_address, notes,
      subtotal, total, status, payment_method, is_paid, internal_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId,
    orderNumber,
    "Test Name",
    "+216 12 345 678",
    "dine_in",
    null,
    null,
    null,
    28,
    28,
    "new",
    "cod",
    0,
    null
  );
  console.log("Order inserted!");

  console.log("Testing insert order_items...");
  db.prepare(`
    INSERT INTO order_items (
      id, order_id, menu_item_id, item_name, unit_price, quantity, total_price, selected_options_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `${orderId}_item_0`,
    orderId,
    "dish-couscous",
    "Couscous",
    28,
    1,
    28,
    "[]"
  );
  console.log("Order item inserted!");

  console.log("Testing insert order_status_history...");
  db.prepare(`
    INSERT INTO order_status_history (order_id, from_status, to_status, note, changed_by)
    VALUES (?, NULL, 'new', 'Order created', 'Customer')
  `).run(orderId);
  console.log("History inserted!");

  // Cleanup test order
  db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
  console.log("Cleaned up successfully!");
} catch (e) {
  console.error("Direct error:", e);
}
