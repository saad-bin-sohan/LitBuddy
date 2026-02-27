import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stylesPath = path.resolve(__dirname, '..', 'src', 'styles.css');
const css = readFileSync(stylesPath, 'utf8');

const DARK_BLOCK_RE = /\[data-theme="dark"\],\s*\[data-color-scheme="dark"\]\s*\{([\s\S]*?)\n\}/;
const ROOT_BLOCK_RE = /:root\s*\{([\s\S]*?)\n\}/;

const darkMatch = css.match(DARK_BLOCK_RE);
const rootMatch = css.match(ROOT_BLOCK_RE);

const failures = [];

if (!darkMatch) {
  failures.push('Could not find canonical dark token block.');
}

if (!rootMatch) {
  failures.push('Could not find top :root token block.');
}

const darkBlock = darkMatch?.[1] ?? '';
const rootBlock = rootMatch?.[1] ?? '';

const requiredDarkTokens = [
  '--color-background: #181818;',
  '--color-surface: #202020;',
  '--color-surface-elevated: #242424;',
  '--color-text: #F7F7F7;',
  '--color-primary: #FF5722;',
  '--color-primary-hover: #FFEB3B;',
  '--color-primary-active: #E64A19;',
  '--color-btn-primary-text: #181818;',
  '--color-accent: #673AB7;',
  '--color-accent-readable: #9575CD;',
  '--color-hover-fill: #FFEB3B;',
  '--color-hover-fill-text: #181818;',
  '--color-secondary: rgba(103, 58, 183, 0.22);',
  '--color-secondary-hover: rgba(255, 235, 59, 0.22);',
  '--color-secondary-active: rgba(255, 235, 59, 0.3);',
  '--color-border: rgba(247, 247, 247, 0.16);',
  '--color-border-secondary: rgba(247, 247, 247, 0.22);',
  '--color-card-border: rgba(247, 247, 247, 0.16);',
  '--color-card-border-inner: rgba(247, 247, 247, 0.12);',
  '--color-focus-ring: rgba(255, 235, 59, 0.55);',
  '--color-error: #FF6B6B;',
  '--color-success: #4CAF50;',
  '--color-warning: #F59E0B;',
  '--color-info: #9575CD;',
];

const requiredLightTokens = [
  '--color-background: #FFFBF1;',
  '--color-text: #050315;',
  '--color-primary: #39727E;',
  '--color-primary-hover: #F96E5B;',
  '--color-primary-active: #E36A6A;',
  '--color-accent: #E36A6A;',
  '--color-accent-readable: #B65555;',
  '--color-hover-fill: #F96E5B;',
  '--color-hover-fill-text: #050315;',
  '--color-warning: #BD5445;',
  '--color-error: #B65555;',
  '--color-success: #39727E;',
  '--color-info: #E36A6A;',
];

for (const token of requiredDarkTokens) {
  if (!darkBlock.includes(token)) {
    failures.push(`Dark block mismatch: missing "${token}"`);
  }
}

for (const token of requiredLightTokens) {
  if (!rootBlock.includes(token)) {
    failures.push(`Top :root light token mismatch: missing "${token}"`);
  }
}

if (darkBlock.includes('#F96E5B')) {
  failures.push('Dark token block contains light-only hover color #F96E5B.');
}

const LIGHT_SCOPED_BLOCK_RE = /\[data-(?:theme|color-scheme)="light"[^\{]*\{([\s\S]*?)\n\}/g;
for (const match of css.matchAll(LIGHT_SCOPED_BLOCK_RE)) {
  const block = match[1] ?? '';
  if (/--color-[a-z0-9-]+\s*:/i.test(block)) {
    failures.push('Light-scoped selector block reintroduces --color-* token declarations.');
    break;
  }
}

const requiredDarkInteractionMarkers = [
  '[data-theme="dark"] a:hover,',
  '[data-theme="dark"] .btn-primary:hover,',
  '[data-theme="dark"] .btn-primary:active,',
  '[data-theme="dark"] .btn-outline:hover,',
];

for (const marker of requiredDarkInteractionMarkers) {
  if (!css.includes(marker)) {
    failures.push(`Dark interaction rule missing marker: "${marker}"`);
  }
}

if (failures.length > 0) {
  console.error('\nTheme token guard failed.\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Theme token guard passed: dark palette frozen and top :root is the light token source.');
