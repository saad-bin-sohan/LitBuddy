import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(projectRoot, 'src');

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const TARGET_EXTENSIONS = new Set(['.js', '.css']);

const ALLOWLIST = {
  // Design tokens are intentionally hex-based in this file.
  'src/styles.css': 'ALL',
  // Google brand icon colors.
  'src/components/GoogleAuth.js': new Set(['#4285F4', '#34A853', '#FBBC05', '#EA4335']),
  // Browser theme-color meta values (light/dark).
  'src/contexts/ThemeContext.js': new Set(['#181818', '#39727E']),
};

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (TARGET_EXTENSIONS.has(path.extname(full))) {
      out.push(full);
    }
  }
  return out;
};

const toRel = (absPath) => path.relative(projectRoot, absPath).replace(/\\/g, '/');

const findings = [];

for (const file of walk(srcRoot)) {
  const rel = toRel(file);
  const content = readFileSync(file, 'utf8');
  const fileAllow = ALLOWLIST[rel];

  if (fileAllow === 'ALL') {
    continue;
  }

  const allowed = fileAllow instanceof Set ? fileAllow : new Set();
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const matches = line.match(HEX_RE);
    if (!matches) {
      return;
    }

    for (const hex of matches) {
      const normalized = hex.toUpperCase();
      if (!allowed.has(normalized)) {
        findings.push({ rel, line: idx + 1, hex: normalized, snippet: line.trim() });
      }
    }
  });
}

if (findings.length > 0) {
  console.error('\nTheme audit failed: non-token hardcoded hex colors detected.');
  console.error('Move colors to CSS variables in src/styles.css or add a reviewed exception.\n');
  for (const finding of findings) {
    console.error(`- ${finding.rel}:${finding.line} -> ${finding.hex}`);
    console.error(`  ${finding.snippet}`);
  }
  process.exit(1);
}

console.log('Theme audit passed: no forbidden hardcoded hex colors found.');
