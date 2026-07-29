# Membership applications

Public `/join` form + Payload admin collection for collecting prospective
member applications to the 静心学堂·泰国 (Mindful Peace Academy Thailand)
network. This is the "intake" surface — no member accounts are created and
no public-facing login is built; admins read incoming applications,
contact applicants out-of-band (WeChat / email), and mark each as
approved / rejected / archived.

## Problem

The brand is currently distributing the "国际靜心協會會員入會申請表"
spreadsheet as an Excel file shared in private groups. People who want to
join print it, fill it by hand, photograph it, and send it back over
WeChat. The data is unstructured, gets lost in chat threads, and there's
no record of who responded or when. The official-site member registration
flow isn't ready and won't be for several months — so this spec is for
the interim collector that bridges that gap.

## Decisions taken during brainstorming

| # | Decision |
|---|----------|
| Q1 | **Pure application collector** — no account creation, no login flow. |
| Q2 | **Full nav + footer entry** at `/join` (single URL across the whole site). |
| Q3 | **Explicit "primary academy" dropdown** in the form (required), auto-pre-filled from `?via=` if present. |
| Q4 | **Single-page form with sections** — no wizard. |
| Q5 | **zh-CN + en** UI, matching the rest of the site. |
| Q6 | **Minimal statuses**: pending → approved / rejected / archived. |
| Q7 | **Email applicant + admin** on submit, reusing the existing EmailJobs queue. |
| Q8 | **Turnstile + IP rate limit**, identical pattern to `/api/reservations`. |

## Architecture

```
Public                              Server                            Admin
─────────────────────────────────────────────────────────────────────────────
nav: 加入协会          ──────►  /join (Next page)
footer: 会员入会               │  • zh/en single-page form
                               │  • Turnstile widget
                               ▼
                      POST /api/memberships
                               │  • Zod schema validate
                               │  • honeypot check
                               │  • Turnstile verify
                               │  • IP rate-limit
                               │  • payload.create(...)
                               │  • enqueueEmail × 2
                               ▼
                      MembershipApplications collection ◄────  Payload admin
                               │                              • list / edit
                               │ afterChange: set reviewedAt   • status flow
                               │                              • internalNotes
                               ▼
                      EmailJobs collection
                               │
                               ▼ (existing cron worker)
                      Resend → applicant + ADMIN_EMAIL
```

No new infrastructure. Every layer reuses something already in the
codebase: `lib/turnstile.ts`, `lib/rate-limit.ts`, `lib/email-jobs.ts`,
`Users` role guard, Payload admin UI, the `EmailJobs` queue + cron
worker, the i18n dictionary in `lib/i18n.ts`.

## Data model

New collection `membershipApplications` (Payload `slug: 'membership-applications'`).

### Identity (9 fields)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text | ✱ | applicant's legal name |
| `email` | email | ✱ | confirmation goes here |
| `wechatId` | text | | applicant's own WeChat ID — primary back-channel for the Chinese-speaking audience; the spreadsheet form didn't have a dedicated row for it (it was filled into freeform "联系方式") but every contact the network actually makes happens over WeChat, so this is a real-life gap to close in the digital version |
| `dharmaName` | text | | 法名,optional |
| `gender` | select | | `male` / `female` / `undisclosed` |
| `birthMonthDay` | text | | `MM-DD` regex; year deliberately omitted for privacy |
| `country` | text | | free text, country / region |
| `whatsapp` | text | | freeform — country code optional |
| `referrer` | text | | introducer's name, freeform |

### Academy affiliation (Q3)

| Field | Type | Required | Notes |
|---|---|---|---|
| `primaryAcademy` | select | ✱ | `bangkok` / `chiangmai` / `phuket` / `undecided` |
| `via` | text | | hidden, auto-set from `?via=` query at submit time — pure analytics |

### Available times (4 booleans, all optional)

`availableWeekdayDay`, `availableWeekdayNight`, `availableWeekendDay`,
`availableWeekendNight`.

### Interests (multi-select, optional)

| Field | Type | Options |
|---|---|---|
| `interests` | select multi | 16 enum values from the template: `tea_intro`, `tea_advanced`, `mindful_organising`, `mindful_arranging`, `mindful_aesthetics`, `mindful_vegetarian`, `mindful_ball`, `wellness_massage`, `health_circle`, `baduanjin`, `meditation_seated`, `meditation_walking`, `body_scan`, `compassion_meditation`, `academy_courses`, `zen_club` |
| `interestsOther` | text | freeform fallback |

### Skills (multi-select, optional)

| Field | Type | Options |
|---|---|---|
| `skills` | select multi | 25 enum values from the template: `editing`, `admin`, `office_software`, `writing`, `graphic_design`, `broadcasting`, `journalism`, `book_publishing`, `photography_video`, `music`, `av_operation`, `social_outreach`, `education`, `counselling`, `hr`, `management`, `media_production`, `new_media_ops`, `audio_video_editing`, `web_maintenance`, `web_software`, `programming`, `legal`, `shorthand`, `healthcare` |
| `skillsOther` | text | freeform fallback |

### Past participation

| Field | Type | Required | Notes |
|---|---|---|---|
| `zenLifeFrequency` | select | | `none` / `one_to_three` / `more_than_three` — for 禪意生活項目 |
| `wisdomLifeFrequency` | select | | same enum — for 智慧人生項目 |
| `pastOrganizations` | textarea | | freeform: other dharma / community involvement |

### Commitment

| Field | Type | Required | Notes |
|---|---|---|---|
| `agreedToJoin` | checkbox | ✱ | replaces the wet signature; must be `true` to submit |

### System fields (Q6 statuses, reviewer audit)

| Field | Type | Notes |
|---|---|---|
| `status` | select | `pending` (default) / `approved` / `rejected` / `archived` |
| `language` | select | `zh` / `en` — browser locale at submit time, helps admins reply in the right language |
| `internalNotes` | textarea | admin-only |
| `submittedAt` | date | readonly, auto-set on create |
| `reviewedAt` | date | readonly, written by hook when `status` transitions away from `pending` |
| `reviewedBy` | relationship → Users | readonly, written by the same hook |

## Frontend `/join`

### Route

- `src/app/(frontend)/join/page.tsx` — server component, renders metadata
  and mounts the client form.
- Locale via the existing `getLocale()` cookie helper. URL is the same for
  both languages.

### Layout

Single sectioned column, max-width 720px. Sections separated by hairline
dividers in the same style as the activity detail page. On screens
≥768px, the "Identity" section uses a 2-column grid (name/email on one
row, dharmaName/gender on the next, etc); every other section stays
single-column because the controls vary in width.

Section order matches the template:

1. Identity (name, email, WeChat ID, dharma name, gender, birth M/D,
   country, WhatsApp, referrer)
2. Primary academy (the required dropdown, auto-pre-filled from
   `?via=` query)
3. Available times (4 checkboxes in a 2×2 grid)
4. Interests (16 checkboxes in a responsive grid + `interestsOther` text)
5. Skills (25 checkboxes in a responsive grid + `skillsOther` text)
6. Past participation (2 radio groups + textarea)
7. Commitment (the `agreedToJoin` checkbox)
8. Turnstile widget
9. Submit button

Header (above section 1):
- Eyebrow: `join.eyebrow`
- H1: `join.title`
- Sub: `join.intro` — "about 6-8 minutes, our team will reach out within
  5-7 days by WeChat or email."

### Validation

- HTML5 required + pattern attributes on text inputs (`pattern` for the
  birth month/day field).
- Submit handler runs the Zod schema (same one the API uses) before the
  network call, so required-field errors surface inline without a
  round-trip.
- If a required field is empty, the first invalid field scrolls into view
  and gets focus; an inline error message renders directly under it.

### Success and error states

- **Success:** the entire form unmounts and a success card replaces it —
  same pattern as `BookingModal`. Card includes:
  - "申请已收到 ✓" / "Application received ✓"
  - Two-line message: "我们会在 5-7 天内通过 ... 联系你" / equivalent EN
  - **Fallback contact** — depends on the submitted `primaryAcademy`:
    - bangkok / chiangmai / phuket → that academy's WeChat ID as a
      `CopyableWechat` (already built), so the applicant can add the
      academy proactively.
    - `undecided` → the `UNDECIDED_FALLBACK.email` from the single
      source defined under "Undecided fallback", rendered as a plain
      mailto link (no `CopyableWechat` because there's no
      network-level WeChat ID).
- **Error:** banner above the submit button. Form contents preserved.
  Distinguish:
  - Validation: per-field inline errors + summary banner
  - Turnstile: banner "反垃圾校验失败,请刷新页面重试"
  - Rate limit (429): banner with retry-after hint
  - Server (5xx): banner "出了点问题,请稍后再试。可以通过微信 X 联系学堂"
    (fallback contact is the primary-academy WeChat).

## API `POST /api/memberships`

File: `src/app/api/memberships/route.ts`. Mirrors
`src/app/api/reservations/route.ts` exactly — same imports, same
ordering, same response shape.

### Request body

```ts
{
  // all fields from the data model above as their JS shape
  // (multi-select arrays as string[], checkboxes as boolean, etc.)
  honeypot?: string,         // hidden field — non-empty means bot
  turnstileToken: string,    // Cloudflare token from the widget
  language: 'zh' | 'en',     // captured client-side at submit
  via?: string,              // ?via= value if any
}
```

### Pipeline

1. Parse JSON, return 400 on malformed.
2. Zod schema validate. Field errors returned in response shape
   `{ ok: false, errors: { fieldName: 'reason' } }` so the form can mark
   individual rows.
3. Honeypot check: if `body.honeypot` is non-empty, return 200 with
   `{ ok: true, applicationId: null }` without persisting (silently
   drop bots — no signal back about why).
4. Turnstile verify via `lib/turnstile.ts`. The existing helper already
   auto-bypasses when `NODE_ENV !== 'production'` (line 5 of that file),
   so no extra dev-mode handling is needed in this route. Returns 400
   with `{ ok: false, error: 'turnstile' }` on failure in production.
5. Rate-limit per IP via `lib/rate-limit.ts`. Window: 10 min. Cap: 5
   submissions. Returns 429 + `Retry-After` header on trip.
6. **No same-email dedupe.** A repeat submission from the same email
   creates a new pending row. Rationale: people who lost a reply or
   wanted to amend their answers will submit again; auto-merging or
   rejecting is paternalistic for a manual-review workflow. Admins can
   filter the list by email if they want to see prior submissions, and
   `internalNotes` is the right place to link related rows by hand.
7. `payload.create({ collection: 'membership-applications', data,
   context: { internal: true } })`.
8. Build the two `{ subject, body }` pairs by calling
   `renderApplicantConfirmation(...)` and `renderAdminNotification(...)`,
   then `enqueueEmail` × 2:
   - Applicant: `to = doc.email`.
   - Admin: `to = process.env.ADMIN_EMAIL`.
   Both calls wrapped in try/catch — failure logs but does NOT fail the
   response. The application is already saved; admins will see it
   regardless of whether email worked.
9. Return `{ ok: true, applicationId: doc.id }` (200).

### Failure shape

| HTTP | Body | When |
|---|---|---|
| 400 | `{ ok: false, errors: {...} }` | Zod validation |
| 400 | `{ ok: false, error: 'turnstile' }` | Turnstile fail |
| 429 | `{ ok: false, error: 'rate_limit' }` + `Retry-After` | IP rate limit |
| 500 | `{ ok: false, error: 'server' }` | Unexpected |

## Email composition

The codebase does NOT have a templating engine — `enqueueEmail` (in
`src/lib/email-jobs.ts`) takes already-rendered `{ to, subject, body, ... }`
strings and writes a row into the `email-jobs` collection which the cron
worker then sends via Resend. Existing booking confirmations build their
strings inline at the call site; we follow the same pattern.

Two new pure functions live in `src/lib/email-templates/memberships.ts`:

```ts
// Inputs are exactly the shape we have at the moment of enqueueing.
function renderApplicantConfirmation(args: {
  applicant: { name; email; wechatId?; language: 'zh' | 'en' }
  academy: { label; wechatId } | null   // null when primaryAcademy === 'undecided'
}): { subject: string; body: string }

function renderAdminNotification(args: {
  applicant: { name; email; wechatId?; whatsapp?; language; via?; submittedAt }
  academy: { slug; label } | null
  applicationId: number
  baseUrl: string                       // e.g. process.env.NEXT_PUBLIC_SERVER_URL
}): { subject: string; body: string }
```

Both return plain-text bodies — no HTML — to match the booking
confirmation tone. The API route imports both, passes the freshly-created
doc + resolved academy info, and forwards the `{ subject, body }` to
`enqueueEmail`. No new collection fields, no template lookup table.

### Applicant confirmation (renderApplicantConfirmation)

Subject:
- `zh` → `您的会员申请已收到 — 静心学堂·泰国`
- `en` → `Your membership application is in — Mindful Peace Academy Thailand`

Body (zh; English version follows the same structure, hand-written):

```
您好 {applicant.name},

感谢您选择加入静心学堂会员。

我们已收到您的申请。工作人员会在 5–7 个工作日内通过邮箱({applicant.email})
{wechatLine}与您联系。

{academyContactBlock}

——
静心学堂·泰国
Mindful Peace Academy Thailand
```

Conditional pieces:
- `wechatLine` is `"或微信({applicant.wechatId})"` when `applicant.wechatId`
  is set; empty otherwise.
- `academyContactBlock` is two cases:
  - When `academy` is non-null: `期间如有问题,您可以直接联系您选择的学堂——{academy.label}(微信: {academy.wechatId})。`
  - When `academy` is null (`primaryAcademy === 'undecided'`):
    `如有疑问可发邮件到 mindfulpeacecm@gmail.com,我们会帮您介绍最近的学堂。`

`mindfulpeacecm@gmail.com` is the network main address (from project
memory). This is the single "undecided fallback" used wherever the
spec promises a contact channel without a specific academy — see
"Undecided fallback" below.

### Admin notification (renderAdminNotification)

Subject: `新会员申请 — {applicant.name}(主要学堂: {academy.label ?? '暂未确定'})`

Body (admins always read in zh, regardless of applicant language):

```
新会员申请已收到:

姓名:        {name}
邮箱:        {email}
微信:        {wechatId 或 '未填'}
WhatsApp:    {whatsapp 或 '未填'}
首选学堂:    {academy.label 或 '暂未确定'}
来源 via:    {via 或 '直接访问'}
申请人语言:  {language}
提交时间:    {submittedAt 用 Asia/Bangkok 格式化为 YYYY-MM-DD HH:mm}

后台查看(需登录):
{baseUrl}/admin/collections/membership-applications/{applicationId}
```

`enqueueEmail` does not have a `relatedMembershipApplication` field on
the existing `email-jobs` schema (only `relatedReservation`). For the
MVP we accept that the membership admin notification has no DB back-link
— the email body's admin URL is enough to find the record. If admins
later report needing the link, a follow-up adds the field and updates
both `enqueueEmail` and `EmailJobs` together; that change is independent
of this spec.

## Undecided fallback (single source of truth)

`primaryAcademy === 'undecided'` is a real value (it's the explicit
"暂未确定" option on the form). Three places need a fallback contact
when an applicant chooses it; all three pull from one constant:

```ts
// src/lib/memberships-fallback.ts  — plural to match the rest of the
// memberships-* / membership-applications file naming.
export const UNDECIDED_FALLBACK = {
  email: 'mindfulpeacecm@gmail.com',
  label: { zh: '静心学堂·泰国', en: 'Mindful Peace Academy Thailand' },
}
```

Where it's used:
1. **Frontend success card** — when the applicant chose `undecided`, the
   success card shows the fallback email (NOT a `CopyableWechat`, because
   the network has no single WeChat ID; only academies do).
2. **Applicant confirmation email** — `academyContactBlock` falls back to
   the email-only line above.
3. **Admin notification subject** — `academy.label` becomes `'暂未确定'`.

## Payload admin

### Collection config (`src/collections/MembershipApplications.ts`)

```ts
slug: 'membership-applications'
labels: { singular: { zh: '会员申请', en: 'Membership application' },
          plural:   { zh: '会员申请', en: 'Membership applications' } }
graphQL: false
disableDuplicate: true
admin: {
  useAsTitle: 'name',
  defaultColumns: ['submittedAt', 'name', 'wechatId', 'primaryAcademy',
                   'status', 'internalNotes'],
  listSearchableFields: ['name', 'email', 'wechatId', 'whatsapp', 'dharmaName'],
}
access: {
  read:   isAdminOrStaff,
  create: ({ req }) => Boolean((req.context as any)?.internal === true),
  update: isAdminOrStaff,
  delete: () => false,
}
hooks: {
  afterChange: [reviewerAuditHook],   // see below
}
```

Note `create` access — admin UI cannot create applications; only the
public POST route (which sets `context.internal = true`) does. This
keeps human "test" rows out of the dataset.

### Reviewer audit hook

`reviewerAuditHook` (in `MembershipApplications.hooks.ts`):

- Fires after every save.
- Recursion guard: returns immediately when `req.context?.skipReviewerAudit
  === true` (the exact flag name; the corrective `payload.update` below
  sets it). Same belt-and-suspenders idea as `syncMediaUrlAfterChange` in
  `Media.hooks.ts`.
- Triggers only when `doc.status !== previousDoc?.status` AND
  `doc.status !== 'pending'`.
- Calls `req.payload.update` with `data: { reviewedAt: new Date(),
  reviewedBy: req.user?.id ?? null }` and `context: { skipReviewerAudit:
  true }`. When `req.user` is absent (Payload local-API calls from
  scripts), `reviewedBy` is set to `null` instead of throwing — Payload's
  relationship fields accept null.

### Field grouping in the edit view

Use Payload `tabs` so the form isn't overwhelming:

- **基本信息** — identity section + primaryAcademy + via
- **意向** — interests + skills + availability
- **过往** — past participation
- **审核** — status + reviewedAt + reviewedBy + internalNotes +
  submittedAt + language + agreedToJoin

The `status` field also lives in the sidebar (`admin.position: 'sidebar'`)
so admins can flip it without scrolling.

## i18n

Add a `join.*` namespace to `src/lib/i18n.ts` with the same shape as the
existing `nav`, `book`, `footer` namespaces. ~80 keys, all bilingual.

Key categories:
- `join.eyebrow`, `join.title`, `join.intro`
- `join.section.{basic|academy|times|interests|skills|past|commitment}`
- `join.field.{name|email|wechatId|dharmaName|gender|birthMonthDay|country|whatsapp|referrer|primaryAcademy|interestsOther|skillsOther|pastOrganizations}`
- `join.field.gender.{male|female|undisclosed}`
- `join.field.primaryAcademy.option.{bangkok|chiangmai|phuket|undecided}`
- `join.field.times.{weekday_day|weekday_night|weekend_day|weekend_night}`
- `join.field.interest.<each enum value>` (16 keys × 2 langs)
- `join.field.skill.<each enum value>` (25 keys × 2 langs)
- `join.field.frequency.{none|one_to_three|more_than_three}`
- `join.consent`
- `join.submit`, `join.submitting`
- `join.success.{title|body|fallback_contact}`
- `join.error.{required|email_format|birth_format|turnstile|rate_limit|server}`

Brand glossary (Ruru / Xindeng / Heguang / Mindful Peace Academy) is
strictly followed in the en strings — no machine-translation of
academy names.

### Navigation surfaces

- Add `nav.joinMembership` key.
- `src/components/layout/Header.tsx` — add the link to the nav list in
  the same place as `nav.book`.
- `src/components/layout/Footer.tsx` — add a footer link under the
  existing "导览" section.

Both links point to `/join`. When the surrounding page is an
academy-scoped page (`/{loc}/...`), the link gets `?via={loc}`
appended; the network-level pages link without a `via` (defaults to
`portal` server-side).

## Validation schema

`src/lib/memberships-schema.ts` — shared Zod schema imported by the
client form and the API route, so both sides reject the same shapes:

```ts
z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(200),
  wechatId: z.string().trim().max(60).optional(),
  dharmaName: z.string().trim().max(80).optional(),
  gender: z.enum(['male','female','undisclosed']).optional(),
  birthMonthDay: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/).optional(),
  country: z.string().trim().max(60).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  referrer: z.string().trim().max(100).optional(),

  primaryAcademy: z.enum(['bangkok','chiangmai','phuket','undecided']),
  via: z.string().trim().max(40).optional(),

  availableWeekdayDay: z.boolean().optional(),
  availableWeekdayNight: z.boolean().optional(),
  availableWeekendDay: z.boolean().optional(),
  availableWeekendNight: z.boolean().optional(),

  interests: z.array(z.enum([...16 enum values])).max(20).optional(),
  interestsOther: z.string().trim().max(300).optional(),

  skills: z.array(z.enum([...25 enum values])).max(30).optional(),
  skillsOther: z.string().trim().max(300).optional(),

  zenLifeFrequency: z.enum(['none','one_to_three','more_than_three']).optional(),
  wisdomLifeFrequency: z.enum(['none','one_to_three','more_than_three']).optional(),
  pastOrganizations: z.string().trim().max(2000).optional(),

  agreedToJoin: z.literal(true),

  language: z.enum(['zh','en']),
  honeypot: z.string().max(0).optional(),
  turnstileToken: z.string().min(1),
})
```

The Payload collection mirrors these constraints via its own field
config (string maxLength, select options, required flags) — both layers
enforce. The Zod schema is authoritative for what the API accepts.

## Tests (TDD)

| Test file | Coverage |
|---|---|
| `src/tests/memberships-schema.test.ts` | Zod schema — every required field rejects empty / wrong shape; multi-select arrays bounded; `birthMonthDay` regex; honeypot empty-only; happy-path passes |
| `src/tests/memberships-route.test.ts` | API pipeline — 400 on Zod fail, 400 on turnstile fail, 429 on rate-limit, 200 + payload write + 2 enqueueEmail calls on happy path, 200 + no DB write when honeypot filled, email enqueue failure does not 500 |
| `src/tests/memberships-hooks.test.ts` | `reviewerAuditHook` — `reviewedAt`/`reviewedBy` written on transition out of `pending`, NOT written when staying in `pending`, recursion guard via `skipReviewerAudit` context |
| `src/tests/memberships-i18n.test.ts` | Every `join.*` key exists in BOTH `zh-CN` and `en` dictionaries; no missing pair |

Each test file follows the existing patterns in `src/tests/`
(reservations-api, hooks, i18n).

## Out of scope

Explicitly NOT included in this design — flagged so we don't slip:

- Member login / account creation (Q1 cap)
- Applicants viewing their own application status from the public site
- Applicants editing or withdrawing their application
- Multi-stage approval workflow (Q6 cap)
- Inviting other applicants / referral bonuses / QR signup codes
- Data export — Payload has a CSV plugin we can add later if needed
- Migration of the existing spreadsheet applications into the new
  collection — handled separately, by hand, after launch
- File uploads (photo, ID, etc.) — the original form doesn't ask for
  any, and we're not adding net-new field types
- A separate "membership rules" page — `agreedToJoin`'s label links to
  a one-paragraph snippet on the same page, not a separate route, for
  the MVP

## Migration / rollout

- No DB migration scripts needed beyond Payload's auto-push (the new
  collection is purely additive; project memory notes auto-push handles
  additive changes safely).
- Soft launch:
  1. Deploy with the nav link hidden behind a feature flag (or simply
     unmerged, until the editor verifies the form once on production).
  2. Editor submits a test application via the form; verify it lands
     in the admin and both emails arrive.
  3. Flip the nav link on.
- Rollback: removing the nav link returns the system to its
  pre-feature state; existing data is preserved.

## Naming conventions

The feature touches four paths, each named for its own audience:

| Surface | Identifier | Why |
|---|---|---|
| Public page | `/join` | Short, memorable, what the editor wants to print on a flyer |
| Public API | `/api/memberships` | REST-style noun for the resource being created |
| Payload collection slug | `membership-applications` | What a row IS (not what an applicant is, since they haven't been admitted) |
| i18n namespace | `join.*` | Matches the public page the strings live on |
| Code paths | `memberships-*.ts` / `MembershipApplications.ts` | Plural noun + collection-style PascalCase, consistent with `Reservations.ts` |

Same feature, different surfaces, different reader. Not aligned by
accident.

## Open questions deferred

None — every Q1–Q8 brainstorm question was answered with the
"recommended" option. If something surfaces during implementation that
needs a product decision (e.g., "should the success page also show a
download for the membership rules PDF?"), it's surfaced back to the
editor inline rather than guessed.
