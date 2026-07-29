# Activity auto-translation on publish

Brief design spec — automate zh-CN → en for activity content when an editor
publishes a Chinese-only activity, so the editor stops doing the two-step
"draft, switch locale, fill English, publish" dance.

## Problem (one paragraph)

The site is bilingual (zh-CN primary, en fallback). The original publish
validator (`activitiesBeforeValidate`) required both locales to be filled for
`title` and `shortDesc` before allowing `status='published'`. In practice the
editor only fills Chinese in the admin, so every publish requires a manual
locale-switch round-trip — and on initial create it's strictly impossible (no
id to look up the other locale). The result: friction, plus a steady stream of
`*_locales` rows with empty `en` content because the workflow encourages
"skip the EN, switch back to Chinese". Falling back to Chinese for English
visitors is acceptable but not ideal; we want both locales filled by default.

## Solution

Auto-translate the `en` locale fields silently when publishing, using the
Anthropic SDK (already in deps) with a brand glossary that forces pinyin for
academy names (如如 → Ruru, never "Suchness"; 心灯 → Xindeng; 和光 → Heguang).

Combined with relaxing the validator (only ZH is hard-required to publish), the
editor's workflow becomes: write Chinese → click "已发布" → save → done. The
EN locale gets filled in the background.

## Scope (MVP)

**Translate** these localized fields zh-CN → en when publishing:

- `title` (text)
- `shortDesc` (textarea)
- `description` (Lexical rich text — walk the tree, translate text nodes,
  preserve structure / formatting / links / lists / headings)

**Leave alone**: `venueNote`, `notes`, `seoTitle`, `seoDescription`. These are
optional and rarely user-facing on the EN side; editor can fill manually.

**Trigger**: a save where the status transitions to `published` (i.e.
`data.status === 'published'` AND `originalDoc?.status !== 'published'`,
including new-doc creates where `originalDoc` is null and `data.status` is
already `published`).

**Idempotency / no-overwrite**: only translate fields where the existing `en`
value is empty/missing. If the editor manually filled EN, respect that and skip.

## Architecture

### Files (new)

- `src/lib/translation-glossary.ts` — `GLOSSARY` constant with brand /
  academies / cities pinyin mappings. Editable in code (PR to change).
- `src/lib/translate.ts` — Anthropic wrapper. Exports:
  - `translateText(zh, opts): Promise<string>` — single string translation.
  - `translateRichText(zhLexicalJson): Promise<lexicalJson>` — walk Lexical
    tree, batch-translate all text nodes, reconstruct.
- `src/collections/Activities.hooks.ts` — add `activitiesAutoTranslate`
  afterChange hook; also relax `activitiesBeforeValidate` to require only
  zh-CN content (en becomes a soft, post-save concern handled by the
  translator).

### Files (modified)

- `src/collections/Activities.ts` — wire `activitiesAutoTranslate` into
  `hooks.afterChange`.
- `.env.example` — document `ANTHROPIC_API_KEY`.
- `src/tests/hooks.test.ts` — rewrite publish-validator tests for the relaxed
  policy; add tests covering the auto-translate trigger.
- `src/tests/translate.test.ts` (new) — Lexical walker + glossary inclusion in
  the prompt, with the Anthropic client mocked.

### Lexical rich-text translation strategy

Walk the Lexical JSON tree, collect every `node.text` leaf into an ordered
array, batch-translate as a numbered list in a single Claude call, then walk
the tree a second time consuming the translations in order. This preserves
every non-text property (formatting flags, links, list types, headings, etc.)
and minimises Claude calls (one call per field, not one per text node).

### Glossary injection

`GLOSSARY` is rendered as a "do NOT translate the meaning of these — use these
exact strings instead" section in the Claude system prompt. The model is
instructed to keep punctuation, brand voice, and tone consistent with the
existing English copy in `i18n.ts` (warm, contemplative, plain).

### Engine

Claude Haiku 4.5 (model id: `claude-haiku-4-5`). Title + shortDesc together
runs ~1s; a typical activity description runs ~2–3s. Total publish latency
extra cost: ~3–5s. Acceptable for an explicit publish action.

Per-publish API cost is ~$0.001 for short content, ~$0.01 for long. A team
publishing 50 activities a month: under $1/mo.

### Failure handling

- Anthropic call wrapped in try/catch with a 30s timeout.
- On failure: `req.payload.logger.warn(...)` with the activity id + which
  field failed; **the doc save is NOT rolled back**. EN stays empty; site
  falls back to ZH for English visitors (current behaviour).
- Missing `ANTHROPIC_API_KEY` → the translator's entry function returns
  early, logs once at info level, no error.
- Per-field errors are independent: if `description` fails but `title`
  succeeds, title still lands in EN.

### Validator changes (combined fix)

`activitiesBeforeValidate`:

- Hard requirement on publish: `title` and `shortDesc` in zh-CN must be
  non-empty.
- Drops the "throw on publish-create" branch entirely.
- Drops the EN check entirely (auto-translate covers it).

## Testing

- Glossary stays in scope (small file, snapshot-tested for shape).
- Lexical walker: collect / apply are pure — unit-tested with hand-built trees
  including text nodes, nested children, formatting marks.
- `translateText`: mocked Anthropic SDK; assert the prompt contains glossary
  terms and the model id is the configured one; assert the returned string
  is what the mock yields.
- Hook trigger: matrix of (operation × original status × new status × EN
  empty/filled) — assert when the translator is invoked vs skipped.
- Hook failure path: mock translator to throw; assert no exception escapes
  and the doc is left as-is.

## Out of scope (deferred)

- Rich-text in `notes` and SEO field translation. Same code shape can extend
  once needed.
- Editor-side "re-translate" button (would re-fill EN even when present).
- Translation memory / caching identical text across activities.
- Glossary as a Payload Global (admin-editable). Current cost: small.
