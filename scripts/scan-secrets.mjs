import fs from "fs";
import path from "path";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".playwright-cli",
  "test-results",
  ".superpowers"
]);

const SECRET_PATTERNS = [
  { name: "Google API Key", regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: "OpenAI Secret Key", regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: "GitHub Personal Access Token", regex: /gh[pousr]_[0-9a-zA-Z]{36}/ },
  { name: "Slack Token", regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/ },
  { name: "Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24}/ },
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "Private RSA/EC/OPENSSH Key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "PostgreSQL with explicit password", regex: /postgres:\/\/[^:]+:[^@\s"']+@[^/\s"']+/ },
  { name: "Hardcoded Bearer Token", regex: /Bearer\s+["'][a-zA-Z0-9_\-\.]{32,}["']/ },
];

let findings = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      // Skip binary, media, sqlite and actual .env (which is local only)
      const ext = path.extname(entry.name).toLowerCase();
      if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".sqlite", ".sqlite-wal", ".sqlite-shm", ".ico", ".woff", ".woff2"].includes(ext)) {
        continue;
      }
      if (entry.name === ".env") {
        continue; // local file, verified in gitignore
      }

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        for (const pattern of SECRET_PATTERNS) {
          const match = content.match(pattern.regex);
          if (match) {
            // Check if it is .env.example with placeholder
            if (entry.name === ".env.example" && match[0].includes("your-postgres-password")) {
              continue;
            }
            findings.push({
              file: fullPath,
              type: pattern.name,
              preview: match[0].slice(0, 10) + "..."
            });
          }
        }
      } catch (err) {
        // ignore unreadable
      }
    }
  }
}

scanDir(".");
console.log(`Scan finished. Findings count: ${findings.length}`);
if (findings.length > 0) {
  console.log(JSON.stringify(findings, null, 2));
}
