# Theme Audit Allowlist

The frontend theme audit (`npm run theme:audit`) blocks hardcoded hex colors in `frontend/src/**/*.js` and `frontend/src/**/*.css`.

## Approved Exceptions

1. `src/styles.css`
- Reason: canonical design-token source (hex primitives and semantic tokens are defined here).

2. `src/components/GoogleAuth.js`
- Allowed: `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`
- Reason: Google brand icon colors.

3. `src/contexts/ThemeContext.js`
- Allowed: `#181818`, `#39727E`
- Reason: browser `theme-color` meta values for dark/light modes.

## Policy

- Any new hardcoded hex value outside the allowlist is treated as a regression.
- New exceptions require design review and documentation update in this file.
