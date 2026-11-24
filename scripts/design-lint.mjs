#!/usr/bin/env node
/**
 * Design Lint — Phase 0 Audit
 * Automated measurements for design system compliance
 * Usage: node scripts/design-lint.mjs
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const ADMIN_STYLES_DIR = path.join(PROJECT_ROOT, 'src', 'styles');
const ADMIN_COMPONENTS_DIR = path.join(PROJECT_ROOT, 'src', 'app', 'admin');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs', 'design-lint');

// Expected tokens from MASTER PROMPT / design spec
const EXPECTED_TOKENS = {
  spacing: [
    'space-0', 'space-0-5', 'space-1', 'space-1-5', 'space-2', 'space-2-5',
    'space-3', 'space-3-5', 'space-4', 'space-5', 'space-6', 'space-7',
    'space-8', 'space-9', 'space-10', 'space-12', 'space-14', 'space-16',
    'space-20', 'space-24',
  ],
  colors: {
    brand: ['color-olive-950', 'color-olive-900', 'color-olive-800', 'color-olive-700', 'color-olive-600', 'color-olive-500', 'color-olive-400', 'color-olive-300', 'color-olive-200', 'color-olive-100', 'color-olive-50'],
    gold: ['color-gold-900', 'color-gold-800', 'color-gold-700', 'color-gold-600', 'color-gold-500', 'color-gold-400', 'color-gold-300', 'color-gold-200', 'color-gold-100', 'color-gold-50'],
    ivory: ['color-ivory-900', 'color-ivory-800', 'color-ivory-700', 'color-ivory-600', 'color-ivory-500', 'color-ivory-400', 'color-ivory-300', 'color-ivory-200', 'color-ivory-100', 'color-ivory-50'],
    charcoal: ['color-charcoal-950', 'color-charcoal-900', 'color-charcoal-800', 'color-charcoal-700', 'color-charcoal-600', 'color-charcoal-500', 'color-charcoal-400', 'color-charcoal-300', 'color-charcoal-200', 'color-charcoal-100'],
  },
  semantic: [
    'bg-base', 'bg-surface', 'bg-surface-elevated', 'bg-surface-hover',
    'bg-card', 'bg-card-hover', 'bg-input', 'bg-input-hover',
    'bg-modal-backdrop', 'bg-modal',
    'text-primary', 'text-secondary', 'text-tertiary', 'text-quaternary',
    'text-inverse', 'text-on-gold', 'text-placeholder',
    'brand-primary', 'brand-primary-hover', 'brand-primary-light',
    'brand-primary-bg', 'brand-primary-border',
    'status-success', 'status-success-bg', 'status-success-border',
    'status-warning', 'status-warning-bg', 'status-warning-border',
    'status-error', 'status-error-bg', 'status-error-border',
    'status-info', 'status-info-bg', 'status-info-border',
    'status-pending', 'status-pending-bg', 'status-pending-border',
    'border-subtle', 'border-default', 'border-strong', 'border-focus', 'border-error',
  ],
  typography: [
    'font-sans', 'font-arabic', 'font-mono',
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl',
    'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold',
    'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed',
    'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest',
  ],
  shadows: [
    'shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
    'shadow-gold-sm', 'shadow-gold-md', 'shadow-gold-lg', 'shadow-gold-xl',
    'shadow-success-sm', 'shadow-error-sm',
    'shadow-inner', 'shadow-inner-lg',
  ],
  radius: [
    'radius-none', 'radius-xs', 'radius-sm', 'radius-md', 'radius-lg', 'radius-xl', 'radius-2xl', 'radius-3xl', 'radius-full',
  ],
  transitions: [
    'ease-out', 'ease-in', 'ease-in-out', 'ease-spring', 'ease-sharp',
    'duration-instant', 'duration-fast', 'duration-normal', 'duration-slow', 'duration-slower',
    'transition-fast', 'transition-normal', 'transition-slow', 'transition-spring',
  ],
  zIndex: [
    'z-base', 'z-dropdown', 'z-sticky', 'z-overlay', 'z-modal', 'z-popover', 'z-tooltip', 'z-toast',
  ],
  layout: [
    'header-height', 'header-height-mobile', 'sidebar-width', 'sidebar-collapsed-width',
    'sidebar-mobile-width', 'content-max-width', 'container-padding', 'container-padding-lg',
  ],
  components: [
    'btn-height-sm', 'btn-height-md', 'btn-height-lg', 'btn-height-xl',
    'btn-padding-x-sm', 'btn-padding-x-md', 'btn-padding-x-lg', 'btn-padding-x-xl',
    'btn-font-size-sm', 'btn-font-size-md', 'btn-font-size-lg', 'btn-font-size-xl',
    'input-height-sm', 'input-height-md', 'input-height-lg',
    'input-padding-x', 'input-padding-y-sm', 'input-padding-y-md', 'input-padding-y-lg',
    'card-padding', 'card-padding-lg', 'card-gap',
    'table-cell-padding-y', 'table-cell-padding-x', 'table-header-height', 'table-row-height', 'table-row-hover-bg',
    'badge-height', 'badge-padding-x', 'badge-font-size', 'badge-radius',
  ],
  rtl: ['direction', 'start', 'end'],
  focus: ['focus-ring-width', 'focus-ring-offset', 'focus-ring-color', 'focus-ring', 'focus-ring-offset-bg'],
  scrollbar: ['scrollbar-width', 'scrollbar-track', 'scrollbar-thumb', 'scrollbar-thumb-hover', 'scrollbar-thumb-active'],
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function extractTokens(cssContent) {
  const tokens = new Set();
  const regex = /--([a-zA-Z0-9-]+):\s*[^;]+;/g;
  let match;
  while ((match = regex.exec(cssContent)) !== null) {
    tokens.add(match[1]);
  }
  return tokens;
}

function findTokenUsage(fileContent, tokenPrefix = '--') {
  const usages = new Map();
  const regex = new RegExp(`var\\(${tokenPrefix}([a-zA-Z0-9-]+)\\)`, 'g');
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    const token = match[1];
    usages.set(token, (usages.get(token) || 0) + 1);
  }
  return usages;
}

async function analyzeDesignTokens() {
  console.log('\n🔍 Analyzing design tokens...');

  const tokensFile = path.join(ADMIN_STYLES_DIR, 'admin-design-tokens.css');
  const content = await fs.readFile(tokensFile, 'utf-8');
  const definedTokens = extractTokens(content);

  const report = {
    defined: definedTokens.size,
    missing: [],
    unused: [],
    categories: {},
  };

  // Check expected tokens
  for (const [category, tokens] of Object.entries(EXPECTED_TOKENS)) {
    const flatTokens = Array.isArray(tokens) ? tokens : Object.values(tokens).flat();
    const categoryDefined = [];
    const categoryMissing = [];

    for (const token of flatTokens) {
      if (definedTokens.has(token)) {
        categoryDefined.push(token);
      } else {
        categoryMissing.push(token);
        report.missing.push({ token, category });
      }
    }

    report.categories[category] = {
      expected: flatTokens.length,
      defined: categoryDefined.length,
      missing: categoryMissing.length,
      tokens: categoryDefined,
    };
  }

  // Find unused tokens (defined but not in expected)
  const allExpected = new Set();
  for (const tokens of Object.values(EXPECTED_TOKENS)) {
    const flat = Array.isArray(tokens) ? tokens : Object.values(tokens).flat();
    flat.forEach(t => allExpected.add(t));
  }

  for (const token of definedTokens) {
    if (!allExpected.has(token) && !token.startsWith('color-')) {
      report.unused.push(token);
    }
  }

  return report;
}

async function analyzeTokenUsage() {
  console.log('🔍 Analyzing token usage in components...');

  const files = await glob('**/*.{tsx,css}', {
    cwd: ADMIN_COMPONENTS_DIR,
    absolute: true,
  });

  const allUsage = new Map();
  const filesAnalyzed = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const usage = findTokenUsage(content);
    const relPath = path.relative(PROJECT_ROOT, file);

    for (const [token, count] of usage) {
      allUsage.set(token, (allUsage.get(token) || 0) + count);
    }

    filesAnalyzed.push({
      file: relPath,
      tokensUsed: usage.size,
    });
  }

  return { allUsage, filesAnalyzed };
}

async function analyzeSpacingConsistency() {
  console.log('🔍 Analyzing spacing consistency...');

  const files = await glob('**/*.{tsx,css}', {
    cwd: ADMIN_COMPONENTS_DIR,
    absolute: true,
  });

  const spacingPatterns = {
    'space-0': 0,
    'space-0-5': 0,
    'space-1': 0,
    'space-1-5': 0,
    'space-2': 0,
    'space-2-5': 0,
    'space-3': 0,
    'space-3-5': 0,
    'space-4': 0,
    'space-5': 0,
    'space-6': 0,
    'space-7': 0,
    'space-8': 0,
    'space-9': 0,
    'space-10': 0,
    'space-12': 0,
    'space-14': 0,
    'space-16': 0,
    'space-20': 0,
    'space-24': 0,
  };

  // Also check for hardcoded pixel values
  const hardcodedPixels = [];
  const pixelRegex = /(?:padding|margin|gap|width|height|top|bottom|left|right)\s*:\s*(\d+)px/gi;

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const relPath = path.relative(PROJECT_ROOT, file);

    // Count spacing token usage
    for (const token of Object.keys(spacingPatterns)) {
      const regex = new RegExp(`var\\(--${token}\\)`, 'g');
      const matches = content.match(regex);
      if (matches) spacingPatterns[token] += matches.length;
    }

    // Find hardcoded pixels
    let match;
    while ((match = pixelRegex.exec(content)) !== null) {
      hardcodedPixels.push({
        file: relPath,
        value: match[1] + 'px',
        context: content.slice(Math.max(0, match.index - 50), match.index + 50),
      });
    }
  }

  return { spacingPatterns, hardcodedPixels };
}

async function analyzeColorContrast() {
  console.log('🔍 Analyzing color contrast (basic check)...');

  const tokensFile = path.join(ADMIN_STYLES_DIR, 'admin-design-tokens.css');
  let content = await fs.readFile(tokensFile, 'utf-8');

  // Strip @media print block to avoid token redefinitions
  content = content.replace(/@media print\s*\{[\s\S]*?\}/g, '');

  // Extract color values
  const colorRegex = /--color-([a-zA-Z0-9-]+):\s*(#[0-9a-fA-F]{3,8});/g;
  const colors = new Map();
  let match;
  while ((match = colorRegex.exec(content)) !== null) {
    colors.set(match[1], match[2]);
  }

  // Check key contrast pairs
  const contrastPairs = [
    { fg: 'text-primary', bg: 'bg-base', required: 4.5 },
    { fg: 'text-secondary', bg: 'bg-base', required: 4.5 },
    { fg: 'text-tertiary', bg: 'bg-base', required: 3 },
    { fg: 'brand-primary-on-dark', bg: 'bg-base', required: 3 },
    { fg: 'brand-primary-on-dark', bg: 'bg-surface', required: 3 },
    { fg: 'text-on-gold', bg: 'brand-primary', required: 4.5 },
    { fg: 'text-primary', bg: 'bg-card', required: 4.5 },
    { fg: 'text-secondary', bg: 'bg-card', required: 4.5 },
  ];

  // Semantic token resolution
  const semanticRegex = /--([a-zA-Z0-9-]+):\s*var\(--([a-zA-Z0-9-]+)\)/g;
  const semanticMap = new Map();
  while ((match = semanticRegex.exec(content)) !== null) {
    semanticMap.set(match[1], match[2]);
  }

  function resolveToken(token) {
    let current = token;
    const visited = new Set();
    while (semanticMap.has(current) && !visited.has(current)) {
      visited.add(current);
      current = semanticMap.get(current);
    }
    return current.replace('color-', '');
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
      return clean.split('').map(c => parseInt(c + c, 16));
    }
    if (clean.length === 6) {
      return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
    }
    if (clean.length === 8) {
      return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
    }
    return [0, 0, 0];
  }

  function luminance(rgb) {
    const srgb = rgb.map(c => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  function contrastRatio(fgHex, bgHex) {
    const fg = hexToRgb(fgHex);
    const bg = hexToRgb(bgHex);
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  const contrastResults = [];

  for (const pair of contrastPairs) {
    const fgToken = resolveToken(pair.fg);
    const bgToken = resolveToken(pair.bg);

    const fgColor = colors.get(fgToken);
    const bgColor = colors.get(bgToken);

    if (fgColor && bgColor) {
      const ratio = contrastRatio(fgColor, bgColor);
      contrastResults.push({
        pair: `${pair.fg} on ${pair.bg}`,
        fgToken,
        bgToken,
        fgColor,
        bgColor,
        ratio: Math.round(ratio * 100) / 100,
        required: pair.required,
        pass: ratio >= pair.required,
      });
    } else {
      contrastResults.push({
        pair: `${pair.fg} on ${pair.bg}`,
        fgToken,
        bgToken,
        error: 'Color not found',
        pass: false,
      });
    }
  }

  return { contrastResults, colorCount: colors.size };
}

async function analyzeComponentPrimitives() {
  console.log('🔍 Analyzing component primitives in globals.css...');

  const globalsFile = path.join(ADMIN_STYLES_DIR, 'admin-globals.css');
  const content = await fs.readFile(globalsFile, 'utf-8');

  const primitives = [
    'btn', 'input', 'card', 'table', 'badge', 'modal', 'dropdown',
    'tooltip', 'toast', 'skeleton', 'avatar', 'divider', 'tabs',
    'accordion', 'select', 'checkbox', 'radio', 'switch', 'slider',
    'progress', 'breadcrumb', 'pagination', 'sidebar', 'header',
    'container', 'grid', 'flex', 'stack', 'cluster', 'reel', 'icon',
  ];

  const found = {};
  const missing = [];

  for (const p of primitives) {
    // Check for .p-{primitive} or .c-{primitive} or component-specific classes
    const patterns = [
      new RegExp(`\\.${p}\\b`),
      new RegExp(`\\.c-${p}\\b`),
      new RegExp(`\\.p-${p}\\b`),
      new RegExp(`@layer components.*\\.${p}\\b`, 's'),
    ];

    let foundMatch = false;
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        foundMatch = true;
        break;
      }
    }

    if (foundMatch) {
      found[p] = true;
    } else {
      missing.push(p);
    }
  }

  // Count utility classes
  const utilityPatterns = {
    'spacing': /\.gap-\d+|\.p-\d+|\.m-\d+|\.px-\d+|\.py-\d+|\.mx-\d+|\.my-\d+/g,
    'typography': /\.text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)|\.font-(light|normal|medium|semibold|bold)|\.leading-(tight|snug|normal|relaxed)/g,
    'colors': /\.text-(primary|secondary|tertiary|quaternary|inverse|on-gold|placeholder)|\.bg-(base|surface|card|input|modal)|\.border-(subtle|default|strong|focus|error)/g,
    'shadows': /\.shadow-(xs|sm|md|lg|xl|2xl|gold|success|error)/g,
    'radius': /\.rounded-(none|xs|sm|md|lg|xl|2xl|3xl|full)/g,
    'transitions': /\.transition-(fast|normal|slow|spring)/g,
  };

  const utilityCounts = {};
  for (const [category, regex] of Object.entries(utilityPatterns)) {
    const matches = content.match(regex);
    utilityCounts[category] = matches ? matches.length : 0;
  }

  return { primitives: { found: Object.keys(found), missing }, utilityCounts };
}

async function analyzeRTLSupport() {
  console.log('🔍 Analyzing RTL support...');

  const files = await glob('**/*.{tsx,css}', {
    cwd: PROJECT_ROOT,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**'],
  });

  let rtlSelectors = 0;
  let logicalProperties = 0;
  let dirAttributes = 0;
  const issues = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const relPath = path.relative(PROJECT_ROOT, file);

    // Count [dir="rtl"] selectors
    const rtlMatches = content.match(/\[dir=["']rtl["']\]/g);
    if (rtlMatches) rtlSelectors += rtlMatches.length;

    // Count logical properties (CSS logical properties + utility classes like ms-, me-, ps-, pe-, text-start, text-end)
    const logicalMatches = content.match(/(margin|padding|border|inset)-(inline|block)-(start|end)/g);
    const utilityLogicalMatches = content.match(/\b(ms|me|ps|pe|text-start|text-end|inline-start|inline-end|flex-row-reverse|space-x-reverse)\b/g);
    if (logicalMatches) logicalProperties += logicalMatches.length;
    if (utilityLogicalMatches) logicalProperties += utilityLogicalMatches.length;

    // Count dir attribute usage
    const dirMatches = content.match(/dir\s*=/g);
    if (dirMatches) dirAttributes += dirMatches.length;

    // Check for hardcoded left/right without logical alternatives
    // Exclude centering patterns (left: 50% with transform: translateX(-50%))
    // Exclude utility classes (.right-0, .left-0, etc.)
    // Exclude border-left/border-right (valid for toast accents, etc.)
    const leftRightMatches = content.match(/\b(left|right)\s*:\s*[\d.]+(%|px|rem|em|vw|vh)?/g) || [];
    const problematicLeftRight = leftRightMatches.filter(match => {
      // Check if this match is part of a border-left/border-right declaration
      const lines = content.split('\n');
      const matchLine = lines.findIndex(l => l.includes(match));
      if (matchLine >= 0) {
        const line = lines[matchLine];
        if (line.includes('border-left') || line.includes('border-right')) return false;
      }
      // Skip centering patterns (50% with translate)
      if (match.includes('50%')) {
        // Verify it's actually a centering pattern by checking nearby context
        if (matchLine >= 0) {
          const context = lines.slice(Math.max(0, matchLine - 3), matchLine + 5).join('\n');
          if (context.includes('translateX(-50%)') || context.includes('translate(-50%') || context.includes('translateX(50%)')) {
            return false; // It's a centering pattern, skip
          }
        }
        return false; // Default: 50% is usually centering
      }
      // Skip utility class definitions (like .right-0 { right: 0; })
      const propValue = match.replace(/\s+/g, '').replace(';', '');
      if (content.includes(`.${propValue.replace(':', '-')}`)) return false;
      // Skip 0 values for utility classes (right: 0, left: 0)
      if (match.match(/\b(left|right)\s*:\s*0\b/)) {
        // Check if it's a utility class definition
        if (matchLine >= 0) {
          const context = lines.slice(Math.max(0, matchLine - 1), matchLine + 2).join('\n');
          if (context.match(/^\s*\.(right|left|start|end)-\d/)) return false;
        }
      }
      return true;
    });
    if (problematicLeftRight.length > 0) {
      issues.push({
        file: relPath,
        type: 'hardcoded-left-right',
        count: problematicLeftRight.length,
        examples: problematicLeftRight.slice(0, 3),
      });
    }
  }

  return { rtlSelectors, logicalProperties, dirAttributes, issues };
}

async function analyzeAccessibility() {
  console.log('🔍 Analyzing accessibility basics...');

  const files = await glob('**/*.tsx', {
    cwd: ADMIN_COMPONENTS_DIR,
    absolute: true,
  });

  const results = {
    ariaLabels: 0,
    ariaDescribedBy: 0,
    ariaExpanded: 0,
    ariaControls: 0,
    roleAttributes: 0,
    focusManagement: 0,
    missingAlt: 0,
    imagesTotal: 0,
    buttonsWithoutType: 0,
    inputsWithoutLabels: 0,
  };

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');

    results.ariaLabels += (content.match(/aria-label\s*=/g) || []).length;
    results.ariaDescribedBy += (content.match(/aria-describedby\s*=/g) || []).length;
    results.ariaExpanded += (content.match(/aria-expanded\s*=/g) || []).length;
    results.ariaControls += (content.match(/aria-controls\s*=/g) || []).length;
    results.roleAttributes += (content.match(/role\s*=/g) || []).length;

    // Focus management patterns
    results.focusManagement += (content.match(/autoFocus|useFocus|focusRef|tabIndex/g) || []).length;

    // Images
    const imgMatches = content.match(/<img\s+[^>]*>/g) || [];
    results.imagesTotal += imgMatches.length;
    for (const img of imgMatches) {
      if (!img.includes('alt=')) results.missingAlt++;
    }

    // Buttons without type
    const buttonMatches = content.match(/<button\s+[^>]*>/g) || [];
    for (const btn of buttonMatches) {
      if (!btn.includes('type=')) results.buttonsWithoutType++;
    }

    // Inputs without labels - use line-by-line parsing to capture multiline input elements
    const lines = content.split('\n');
    let inInput = false;
    let currentInput = '';
    const inputMatches = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('<input') || (inInput && line.includes('<input'))) {
        inInput = true;
        currentInput = line;
      } else if (inInput) {
        currentInput += '\n' + line;
      }

      if (inInput && (line.includes('/>') || line.includes('</input>'))) {
        inputMatches.push(currentInput);
        inInput = false;
        currentInput = '';
      }
    }

    for (const input of inputMatches) {
      const idMatch = input.match(/id\s*=\s*["'`]([^"'`]+)["'`]/);
      if (idMatch) {
        const id = idMatch[1];
        // Check for htmlFor label OR aria-label OR aria-labelledby on the input itself
        const hasLabel = content.includes(`htmlFor="${id}"`) ||
                         content.includes(`htmlFor='${id}'`) ||
                         content.includes(`htmlFor={\`${id}\`}`) ||
                         input.includes('aria-label') ||
                         input.includes('aria-labelledby');
        if (!hasLabel) results.inputsWithoutLabels++;
      } else {
        // No ID, check for aria-label or aria-labelledby
        if (!input.includes('aria-label') && !input.includes('aria-labelledby')) {
          results.inputsWithoutLabels++;
        }
      }
    }
  }

  return results;
}

async function generateReport(allResults) {
  await ensureDir(OUTPUT_DIR);
  const reportPath = path.join(OUTPUT_DIR, 'design-lint-report.json');
  await fs.writeFile(reportPath, JSON.stringify(allResults, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('DESIGN LINT SUMMARY');
  console.log('='.repeat(60));

  // Tokens
  const tokens = allResults.tokens;
  console.log(`\n📦 Design Tokens:`);
  console.log(`  Defined: ${tokens.defined}`);
  console.log(`  Missing: ${tokens.missing.length}`);
  console.log(`  Unused:  ${tokens.unused.length}`);
  for (const [cat, data] of Object.entries(tokens.categories)) {
    const status = data.missing === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${cat}: ${data.defined}/${data.expected} (missing: ${data.missing})`);
  }

  // Usage
  const usage = allResults.usage;
  console.log(`\n📊 Token Usage:`);
  console.log(`  Files analyzed: ${usage.filesAnalyzed.length}`);
  console.log(`  Unique tokens used: ${usage.allUsage.size}`);
  const topTokens = Array.from(usage.allUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log(`  Top 10 most used:`);
  for (const [token, count] of topTokens) {
    console.log(`    --${token}: ${count}`);
  }

  // Spacing
  const spacing = allResults.spacing;
  console.log(`\n📏 Spacing Consistency:`);
  const usedSpacing = Object.entries(spacing.spacingPatterns).filter(([_, v]) => v > 0);
  console.log(`  Tokens used: ${usedSpacing.length}/21`);
  const hardcoded = spacing.hardcodedPixels.length;
  console.log(`  Hardcoded pixels found: ${hardcoded}`);
  if (hardcoded > 0) {
    console.log(`  ⚠️  Top files with hardcoded px:`);
    const byFile = {};
    for (const hp of spacing.hardcodedPixels) {
      byFile[hp.file] = (byFile[hp.file] || 0) + 1;
    }
    Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([file, count]) => {
      console.log(`    ${file}: ${count}`);
    });
  }

  // Contrast
  const contrast = allResults.contrast;
  console.log(`\n🎨 Color Contrast:`);
  console.log(`  Colors defined: ${contrast.colorCount}`);
  const passed = contrast.contrastResults.filter(r => r.pass).length;
  const failed = contrast.contrastResults.filter(r => !r.pass).length;
  console.log(`  Pairs passing: ${passed}/${contrast.contrastResults.length}`);
  if (failed > 0) {
    console.log(`  ❌ Failing pairs:`);
    for (const r of contrast.contrastResults.filter(r => !r.pass)) {
      if (r.ratio) {
        console.log(`    ${r.pair}: ${r.ratio}:1 (need ${r.required}:1)`);
      } else {
        console.log(`    ${r.pair}: ${r.error}`);
      }
    }
  }

  // Primitives
  const primitives = allResults.primitives;
  console.log(`\n🧱 Component Primitives:`);
  console.log(`  Found: ${primitives.primitives.found.length}`);
  console.log(`  Missing: ${primitives.primitives.missing.length}`);
  if (primitives.primitives.missing.length > 0) {
    console.log(`  ⚠️  Missing: ${primitives.primitives.missing.join(', ')}`);
  }
  console.log(`  Utility classes:`);
  for (const [cat, count] of Object.entries(primitives.utilityCounts)) {
    console.log(`    ${cat}: ${count}`);
  }

  // RTL
  const rtl = allResults.rtl;
  console.log(`\n🌐 RTL Support:`);
  console.log(`  [dir="rtl"] selectors: ${rtl.rtlSelectors}`);
  console.log(`  Logical properties: ${rtl.logicalProperties}`);
  console.log(`  dir attributes: ${rtl.dirAttributes}`);
  console.log(`  Hardcoded left/right issues: ${rtl.issues.length}`);
  if (rtl.issues.length > 0) {
    console.log(`  ⚠️  Files with issues:`);
    for (const issue of rtl.issues.slice(0, 5)) {
      console.log(`    ${issue.file}: ${issue.count} instances`);
    }
  }

  // Accessibility
  const a11y = allResults.accessibility;
  console.log(`\n♿ Accessibility:`);
  console.log(`  aria-label: ${a11y.ariaLabels}`);
  console.log(`  aria-describedby: ${a11y.ariaDescribedBy}`);
  console.log(`  aria-expanded: ${a11y.ariaExpanded}`);
  console.log(`  aria-controls: ${a11y.ariaControls}`);
  console.log(`  role attributes: ${a11y.roleAttributes}`);
  console.log(`  focus management: ${a11y.focusManagement}`);
  console.log(`  Images: ${a11y.imagesTotal} (missing alt: ${a11y.missingAlt})`);
  console.log(`  Buttons without type: ${a11y.buttonsWithoutType}`);
  console.log(`  Inputs without labels: ${a11y.inputsWithoutLabels}`);

  console.log(`\n📄 Full report: ${reportPath}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('DESIGN LINT — Phase 0 Audit');
  console.log('='.repeat(60));

  try {
    const [
      tokens,
      usage,
      spacing,
      contrast,
      primitives,
      rtl,
      accessibility,
    ] = await Promise.all([
      analyzeDesignTokens(),
      analyzeTokenUsage(),
      analyzeSpacingConsistency(),
      analyzeColorContrast(),
      analyzeComponentPrimitives(),
      analyzeRTLSupport(),
      analyzeAccessibility(),
    ]);

    const allResults = {
      timestamp: new Date().toISOString(),
      tokens,
      usage,
      spacing,
      contrast,
      primitives,
      rtl,
      accessibility,
    };

    await generateReport(allResults);
    console.log('\n✅ Design lint complete!');
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

main();