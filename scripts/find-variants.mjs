import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  const matches = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== "node_modules" && f !== ".next" && f !== ".git") {
        matches.push(...walk(full));
      }
    } else if (full.endsWith(".tsx")) {
      const code = fs.readFileSync(full, "utf8");
      if (code.includes('variant="secondary"') || code.includes("variant='secondary'")) {
        matches.push(full);
      }
    }
  }
  return matches;
}

console.log("Secondary variant files:", walk("src"));
