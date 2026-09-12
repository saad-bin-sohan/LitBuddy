// frontend/src/api/csrfHeaderCoverage.test.js
//
// 2026-09 regression guard.
//
// backend/middleware/csrfMiddleware.js rejects any POST/PUT/PATCH/DELETE
// request that has an Origin header but doesn't carry
// 'X-Requested-With: XMLHttpRequest'. That header is only guaranteed to
// be present when a request is made through apiFetch()/apiJson() in
// ./httpClient (see httpClient.test.js for coverage of the header
// itself). The 2026-09 bug was ~16 files across this app quietly
// building their own `fetch(...)`/`axios.___(...)` calls instead, so
// every mutating request they made was silently rejected with a 403.
//
// This is a static source scan, not a type system -- it can't see
// *inside* a call to know whether the right header made it onto the
// wire, only whether a mutating call bypasses apiFetch()/apiJson() in
// the first place. That's deliberate: the bug class here was entirely
// about which transport a file reached for, so a scan over "does this
// file's source text still reach for a bare fetch()/axios call for a
// non-GET request" is exactly the right level to catch a regression
// (e.g. someone adding a new api/*.js file, or a new function to an
// existing one, that copies the old raw-fetch pattern) without needing
// a live server. GET-only calls are intentionally not flagged: they are
// exempt from the CSRF check by design (see SAFE_METHODS in
// csrfMiddleware.js), and frontend/src/api/contentApi.js is a real,
// audited example of a file that legitimately keeps raw fetch() for
// that reason.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = path.dirname(fileURLToPath(import.meta.url));
const MUTATING_METHODS = /method\s*:\s*['"](POST|PUT|PATCH|DELETE)['"]/i;

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/(^|[^:])\/\/.*$/gm, '$1'); // line comments (keeps a leading ':' so 'https://' survives)
}

/**
 * Returns every character offset in `source` where a *raw* fetch(
 * call starts -- i.e. not apiFetch(, not a substring of a longer
 * identifier, and not inside a comment (comments are stripped first).
 */
function findRawFetchCalls(source) {
  const clean = stripComments(source);
  const matches = [];
  const re = /\bfetch\(/g;
  let m;
  while ((m = re.exec(clean))) {
    matches.push(m.index);
  }
  return { clean, offsets: matches };
}

/** True if a POST/PUT/PATCH/DELETE method appears within `windowSize`
 * characters after a call site -- i.e. the call is mutating. */
function isMutatingCallAt(clean, offset, windowSize = 500) {
  const window = clean.slice(offset, offset + windowSize);
  return MUTATING_METHODS.test(window);
}

function listApiFiles() {
  return fs
    .readdirSync(API_DIR)
    .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
    .map((f) => path.join(API_DIR, f));
}

describe('CSRF header coverage: frontend/src/api/*.js', () => {
  it('never builds a raw, mutating fetch() call outside of ./httpClient itself', () => {
    const offenders = [];

    for (const file of listApiFiles()) {
      const isHttpClient = path.basename(file) === 'httpClient.js';
      const source = fs.readFileSync(file, 'utf8');
      const { clean, offsets } = findRawFetchCalls(source);

      for (const offset of offsets) {
        if (isHttpClient) continue; // this IS the wrapper; it's expected to call fetch() directly
        if (!isMutatingCallAt(clean, offset)) continue; // GET-only raw fetch is fine (CSRF-exempt)

        const line = clean.slice(0, offset).split('\n').length;
        offenders.push(`${path.basename(file)}:${line}`);
      }
    }

    expect(
      offenders,
      `Found raw, mutating fetch() call(s) that bypass apiFetch()/apiJson() ` +
        `(and therefore the required X-Requested-With header) at: ${offenders.join(', ')}`
    ).toEqual([]);
  });

  it('never builds a raw axios POST/PUT/PATCH/DELETE call anywhere in src/ (outside node_modules)', () => {
    const srcDir = path.resolve(API_DIR, '..');
    const offenders = [];
    const axiosMutationRe = /axios\.(post|put|patch|delete)\(/;

    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
          const clean = stripComments(fs.readFileSync(full, 'utf8'));
          if (axiosMutationRe.test(clean)) {
            offenders.push(path.relative(srcDir, full));
          }
        }
      }
    }

    walk(srcDir);

    expect(
      offenders,
      `Found raw axios mutating call(s) that bypass apiJson() at: ${offenders.join(', ')}`
    ).toEqual([]);
  });
});
