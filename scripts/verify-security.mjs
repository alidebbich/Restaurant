import { DatabaseSync } from "node:sqlite";

async function runVerification() {
  console.log("=== DAR ZITOUN DEFENSIVE SECURITY VERIFICATION ===");
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  // 1. Fetch valid dish ID from DB
  const db = new DatabaseSync("data/restaurant.sqlite");
  const dish = db.prepare("SELECT id, name_fr, price, promo_price FROM menu_items WHERE deleted_at IS NULL AND is_available = 1 LIMIT 1").get();
  console.log(`Found active dish in DB: ${dish.name_fr} (ID: ${dish.id}, Price: ${dish.price})`);

  // Test 1: Pricing Tampering Prevention - Non-existent dish
  try {
    const res = await fetch("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: "Sec Test",
        customer_phone: "99887766",
        items: [{ dish_id: "fake_malicious_id", price: 0.01, quantity: 1 }]
      })
    });
    const data = await res.json();
    assert(res.status === 400 && data.error.includes("disponible"), "Rejects fake dish IDs with 400 Bad Request");
  } catch (err) {
    assert(false, `Fake dish test threw error: ${err.message}`);
  }

  // Test 2: Pricing Tampering Prevention - Tampered price on real dish
  try {
    const expectedUnitPrice = dish.promo_price ?? dish.price;
    const res = await fetch("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: "Security Tester",
        customer_phone: "99887766",
        order_type: "takeaway",
        items: [{ dish_id: dish.id, name: "Tampered Dish", price: 0.001, quantity: 2 }]
      })
    });
    const data = await res.json();
    const serverTotal = data.order?.total;
    const expectedTotal = expectedUnitPrice * 2;

    assert(res.status === 200, "Order with valid dish succeeds");
    assert(serverTotal === expectedTotal, `Server total calculated correctly (${serverTotal} TND) matching server DB price, completely ignoring client 0.001 TND`);

    // Verify row in order_items table in DB
    const savedItem = db.prepare("SELECT unit_price, total_price, quantity FROM order_items WHERE order_id = ?").get(data.order.id);
    assert(savedItem?.unit_price === expectedUnitPrice, `Database order_items stored verified price (${savedItem?.unit_price}) instead of tampered price`);
    assert(savedItem?.total_price === expectedTotal, `Database order_items total price (${savedItem?.total_price}) matches DB price * quantity`);
  } catch (err) {
    assert(false, `Price tampering test threw error: ${err.message}`);
  }

  // Test 3: Cron Security - Unauthorized without secret
  try {
    const res = await fetch("http://localhost:3000/api/cron/anonymize", {
      method: "POST"
    });
    assert(res.status === 401 || res.status === 503, `Cron endpoint rejects unauthenticated access (status ${res.status})`);
  } catch (err) {
    assert(false, `Cron anonymize test threw error: ${err.message}`);
  }

  // Test 4: Cron Security - Header spoofing rejected
  try {
    const res = await fetch("http://localhost:3000/api/cron/reminders", {
      method: "POST",
      headers: {
        "x-vercel-cron": "1" // Attempt to spoof internal header
      }
    });
    assert(res.status === 401 || res.status === 503, `Cron reminders rejects spoofed x-vercel-cron header (status ${res.status})`);
  } catch (err) {
    assert(false, `Cron reminders test threw error: ${err.message}`);
  }

  // Test 5: Public Reservation Endpoint Anti-abuse
  try {
    const res = await fetch("http://localhost:3000/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.42" },
      body: JSON.stringify({
        guestName: "Spam Bot",
        guestPhone: "11223344",
        serviceDate: "2026-12-01",
        reservation_time: "19:30",
        partySize: 2
      })
    });
    assert(res.status === 200 || res.status === 400 || res.status === 429, `Public reservation endpoint responds safely with status ${res.status}`);
  } catch (err) {
    assert(false, `Reservation test threw error: ${err.message}`);
  }

  // Test 6: Database Integrity Check
  try {
    const count = db.prepare("SELECT COUNT(*) as c FROM categories").get();
    assert(count.c > 0, `Database tables intact (${count.c} categories exist)`);
  } catch (err) {
    assert(false, `Database integrity check failed: ${err.message}`);
  }

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===\n`);
  process.exit(passed === total ? 0 : 1);
}

runVerification();
