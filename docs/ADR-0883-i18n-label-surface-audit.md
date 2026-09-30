# ADR-0883 — i18n / label surface audit: complete

## Status
Accepted (audit record), v1.7.909

## Context
Continuing the audit-completeness sweep (ADR-0763…0882). This round covered the
localisation and accessible-name surface: every way a user-visible string can be
authored in the single-file app, and whether it can go stale or untranslated.

## Audit axes

### t() call-site coverage
- `t(k)` resolves `T[k] || I18N.en[k] || k` — a missing key degrades to the key
  name, never `undefined` (index.html:1116).
- **Every literal `t('…')` call site is pinned**: test.mjs extracts all call-site
  keys and asserts each resolves in BOTH `ja` and `en` (ADR-0335 guard), so an
  unlocalised string cannot ship.

### The four data-t mechanisms
- `data-t` → textContent, `data-t-aria` → aria-label, `data-t-ph` → placeholder,
  `data-t-title` → title — all applied in one `UI.applyI18n()` pass over
  `document` (index.html:9203).
- `data-t-title` preserves the authored ` (X)` shortcut suffix via regex when
  re-writing the localized title.
- Nested `k.*` keys (tool names) resolve via `tk()` which tries `T.k[slice]` then
  `I18N.en.k[slice]` then the flat table.

### Dynamic labels (not data-t-marked)
- `btnLang`/`btnTheme`: static English placeholders replaced by
  `refreshLangBtn`/`refreshThemeBtn` at boot before first paint and on every
  toggle — language names are invariant proper nouns, theme names localized keys.
- Canvas aria-label re-derives on tool switch AND on language toggle
  (`T.k[tool] || tool — canvasHint`).
- Context menus rebuild per open → always current language.
- Page-tab chips, peer avatars, status readouts: created with `t()` at build.

### Screen-reader announce parity
- `describeShape` announces type, geometry role, bound endpoints, group, hidden,
  flip/shadow/route/hop, dash/align/valign and text flags (ADR-0882) — the
  style-identity set a sighted user sees in the panel.

## Conclusion
The i18n/label surface is closed: authored strings are either `data-t`-marked
(and therefore re-applied on toggle) or built through `t()` at render. No
hardcoded-locale path remains. No defect found this round — recorded as an
audit-complete ADR per the series convention.
