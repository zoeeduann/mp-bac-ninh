/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import '@payloadcms/next/css'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

// LOCAL ADDITION (not part of Payload codegen): bump from Vercel's 10s
// Hobby default → 60s so admin saves that trigger sync email sends
// (reservation confirm fires afterChange → Resend) don't get killed
// mid-flight. Resend now has an AbortController-bounded 8s timeout per
// attempt (see src/lib/email.ts) so happy path stays under 2s; this is
// purely a safety ceiling. If Payload's `pnpm payload generate` ever
// regenerates this file, re-add this line.
export const maxDuration = 60

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
