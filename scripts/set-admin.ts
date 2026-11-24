import crypto from "node:crypto";
import { Pool } from "pg";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

async function setAdmin() {
  const args = process.argv.slice(2);
  const username = args[0] || "admin";
  const password = args[1] || "Admin123456!";
  const email = args[2] || "admin@darzitoun.tn";
  const fullName = args[3] || "Directeur Général";

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const userId = "usr_" + crypto.randomUUID().slice(0, 8);

  console.log("--------------------------------------------------");
  console.log("🔑 Configuration du compte Administrateur Dar Zitoun");
  console.log(`👤 Nom d'utilisateur : ${username}`);
  console.log(`📧 Email              : ${email}`);
  console.log(`🔒 Mot de passe       : ${password}`);
  console.log(`🏷️  Rôle               : super_admin`);
  console.log("--------------------------------------------------");

  // 1. Update PostgreSQL (darzitoun) if DATABASE_URL is configured
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    try {
      const pool = new Pool({ connectionString });
      const client = await pool.connect();
      try {
        // Check if user already exists
        const { rows } = await client.query("SELECT id FROM admin_users WHERE username = $1 OR email = $2", [username, email]);
        if (rows.length > 0) {
          await client.query(
            "UPDATE admin_users SET password_hash = $1, salt = $2, full_name = $3, is_active = 1, role = 'super_admin', updated_at = NOW() WHERE id = $4",
            [passwordHash, salt, fullName, rows[0].id]
          );
          console.log("✅ Mis à jour avec succès dans PostgreSQL (darzitoun).");
        } else {
          await client.query(
            `INSERT INTO admin_users (id, username, email, password_hash, salt, full_name, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, 'super_admin', 1)`,
            [userId, username, email, passwordHash, salt, fullName]
          );
          console.log("✅ Créé avec succès dans PostgreSQL (darzitoun).");
        }
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("⚠️ Avertissement PostgreSQL :", msg);
    }
  } else {
    console.log("ℹ️  Aucune variable DATABASE_URL détectée — étape PostgreSQL ignorée.");
  }

  // 2. Also update SQLite if present for compatibility
  const sqlitePath = path.join(process.cwd(), "data", "restaurant.sqlite");
  if (fs.existsSync(sqlitePath)) {
    try {
      const sqlite = new DatabaseSync(sqlitePath);
      const existing = sqlite.prepare("SELECT id FROM admin_users WHERE username = ? OR email = ?").get(username, email) as { id: string } | undefined;
      if (existing) {
        sqlite.prepare(
          "UPDATE admin_users SET password_hash = ?, salt = ?, full_name = ?, is_active = 1, role = 'super_admin', updated_at = datetime('now') WHERE id = ?"
        ).run(passwordHash, salt, fullName, existing.id);
        console.log("✅ Mis à jour avec succès dans SQLite (restaurant.sqlite).");
      } else {
        sqlite.prepare(
          `INSERT INTO admin_users (id, username, email, password_hash, salt, full_name, role, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 'super_admin', 1)`
        ).run(userId, username, email, passwordHash, salt, fullName);
        console.log("✅ Créé avec succès dans SQLite (restaurant.sqlite).");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("⚠️ Avertissement SQLite :", msg);
    }
  }

  console.log("\n🎉 Le compte administrateur est prêt à être utilisé sur /admin/login !");
}

setAdmin().catch(console.error);

