import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const FILE = path.join(PROJECT_ROOT, 'src', 'app', 'admin', 'menu', 'MenuItemForm.tsx');

function extractInputs(content) {
  const inputs = [];
  let pos = 0;

  while (true) {
    const start = content.indexOf('<input', pos);
    if (start === -1) break;

    let depth = 0;
    let inQuote = false;
    let quoteChar = '';
    let inBrace = 0;
    let end = -1;

    for (let i = start; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';

      if (!inQuote && (char === '"' || char === "'" || char === '`')) {
        inQuote = true;
        quoteChar = char;
      } else if (inQuote && char === quoteChar && prevChar !== '\\') {
        inQuote = false;
        quoteChar = '';
      } else if (!inQuote) {
        if (char === '{') {
          inBrace++;
        } else if (char === '}') {
          inBrace--;
        } else if (inBrace === 0) {
          if (char === '<' && content.slice(i, i + 6) !== '<input') {
            depth++;
          } else if (char === '>' && depth > 0) {
            depth--;
          } else if (char === '>' && depth === 0) {
            end = i;
            break;
          }
        }
      }
    }

    if (end !== -1) {
      inputs.push(content.slice(start, end + 1));
      pos = end + 1;
    } else {
      pos = start + 6;
    }
  }

  return inputs;
}

async function main() {
  const content = await fs.readFile(FILE, 'utf-8');
  const inputs = extractInputs(content);

  for (const input of inputs) {
    if (input.includes('option-group-name')) {
      console.log('FULL INPUT:');
      console.log(input);
      console.log('---');
      console.log('Has aria-label:', input.includes('aria-label'));
    }
  }
}

main();