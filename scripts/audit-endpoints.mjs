import fs from "node:fs";
import path from "node:path";

function findRoutes(dir) {
  const routes = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      routes.push(...findRoutes(full));
    } else if (f === "route.ts" || f === "route.js") {
      routes.push(full);
    }
  }
  return routes;
}

const apiRoutes = findRoutes("src/app/api");

const report = [];

for (const r of apiRoutes) {
  const code = fs.readFileSync(r, "utf8");
  const rel = path.relative("src/app/api", r).replace(/\\/g, "/");

  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"].filter(m =>
    new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b|export\\s+const\\s+${m}\\s*=`).test(code)
  );

  const hasAuth = code.includes("withAdminAuth") || code.includes("getCurrentUser") || code.includes("requireAdminAuth");
  const hasCsrf = code.includes("validateCsrfToken") || code.includes("ensureCsrfToken");
  const hasZod = code.includes("z.object") || code.includes("schema");

  report.push({
    route: rel,
    methods,
    hasAuth,
    hasCsrf,
    hasZod,
    isAdmin: rel.startsWith("admin/"),
  });
}

console.log(JSON.stringify(report, null, 2));
