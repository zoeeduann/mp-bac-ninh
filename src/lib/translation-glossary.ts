/**
 * zh-CN → en glossary fed into the Claude system prompt for auto-translation.
 *
 * Locks the names that MUST stay pinyin (Ruru, Xindeng, Heguang) rather than
 * being translated by meaning (which a vanilla LLM would produce as
 * "Suchness", "Heart Lamp", "Harmony Light"), plus the canonical brand spelling
 * and the Thai city names.
 *
 * Edit by PR; not admin-editable on purpose — these change once a decade.
 */
export const GLOSSARY = {
  brand: {
    '静心学堂 · 泰国': 'Mindful Peace Academy Thailand',
    '静心学堂·泰国': 'Mindful Peace Academy Thailand',
    '静心学堂': 'Mindful Peace Academy',
  },
  academies: {
    '曼谷如如学堂': 'Bangkok Ruru Academy',
    '清迈心灯学堂': 'Chiang Mai Xindeng Academy',
    '普吉和光小院': 'Phuket Heguang Courtyard',
    '如如学堂': 'Ruru Academy',
    '心灯学堂': 'Xindeng Academy',
    '和光小院': 'Heguang Courtyard',
    '如如': 'Ruru',
    '心灯': 'Xindeng',
    '和光': 'Heguang',
  },
  cities: {
    '曼谷': 'Bangkok',
    '清迈': 'Chiang Mai',
    '普吉': 'Phuket',
    '泰国': 'Thailand',
  },
} as const

/** Render the glossary as a "- zh = en" block for inclusion in a prompt. */
export function glossaryForPrompt(): string {
  const lines: string[] = []
  for (const cat of Object.values(GLOSSARY)) {
    for (const [zh, en] of Object.entries(cat)) {
      lines.push(`- ${zh} = ${en}`)
    }
  }
  return lines.join('\n')
}
