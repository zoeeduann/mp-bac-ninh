/**
 * One-off script: reset the admin user's password to a known value.
 * Run with: pnpm tsx --tsconfig tsconfig.seed.json --env-file .env.local scripts/reset-admin-password.ts <new-password>
 * Default password if not provided: jingxin2026
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function resetAdminPassword() {
  const newPassword = process.argv[2] || 'jingxin2026'
  const email = 'superduanziwei@gmail.com'

  const payload = await getPayload({ config })

  const found = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  if (found.totalDocs === 0) {
    console.error(`[ERR] No user with email ${email}`)
    process.exit(1)
  }

  const user = found.docs[0]
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { password: newPassword },
    overrideAccess: true,
  })

  console.log(`[OK] Password reset for ${email}`)
  console.log(`     New password: ${newPassword}`)
  console.log(`     Log in at: http://localhost:3000/admin`)
  process.exit(0)
}

resetAdminPassword().catch((err) => {
  console.error(err)
  process.exit(1)
})
