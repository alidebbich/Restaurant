import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/restaurant.sqlite");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables:", tables.map(t => t.name));

const cols = db.prepare("PRAGMA table_info(reservations)").all();
console.log("Reservations columns:", cols.map(c => c.name));

