/**
 * One-off: strip remaining 麦林 / Mae Rim references from chiangmai location.
 * Updates address + story (richText) per locale.
 *
 * Run: pnpm tsx --tsconfig tsconfig.seed.json --env-file .env.local scripts/strip-mae-rim.ts
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

function toRichText(text: string) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          format: '' as const,
          indent: 0,
          version: 1,
          direction: 'ltr' as const,
          children: [
            { mode: 'normal' as const, text, type: 'text', style: '', detail: 0, format: 0, version: 1 },
          ],
        },
      ],
    },
  }
}

async function main() {
  const payload = await getPayload({ config })

  const found = await payload.find({
    collection: 'locations',
    where: { slug: { equals: 'chiangmai' } },
    limit: 1,
    overrideAccess: true,
  })

  if (found.docs.length === 0) {
    console.error('chiangmai location not found')
    process.exit(1)
  }

  const id = found.docs[0].id

  // zh-CN locale
  await payload.update({
    collection: 'locations',
    id,
    data: {
      address: '清迈',
      story: toRichText(
        '心灯学堂位于清迈。这里是一处与日常修学相伴的安静空间——晨修、共修、茶会、行禅,以及住山闭关。',
      ) as any,
    },
    locale: 'zh-CN',
    overrideAccess: true,
  })
  console.log('[OK] zh-CN: address + story updated')

  // en locale
  await payload.update({
    collection: 'locations',
    id,
    data: {
      address: 'Chiang Mai',
      story: toRichText(
        'Xindeng Academy in Chiang Mai. A quiet space alongside everyday practice — morning sittings, shared practice, tea, walking meditation, and residential retreats.',
      ) as any,
    },
    locale: 'en',
    overrideAccess: true,
  })
  console.log('[OK] en: address + story updated')

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
