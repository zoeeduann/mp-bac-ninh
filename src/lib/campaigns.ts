export type CampaignFocus = 'mindfulness' | 'buddhism'

export function isCampaignFocus(value: string): value is CampaignFocus {
  return value === 'mindfulness' || value === 'buddhism'
}

export const campaignCopy = {
  mindfulness: {
    label: '正念活动',
    eyebrow: '正念 · 禅茶 · 禅意生活',
    title: ['在北宁，', '给心留一处安静。'],
    description:
      '从一杯茶、一次正念练习开始。在善明静心小院，通过公益免费的正念活动，认识静心文化，让觉察慢慢走进日常。',
    cta: '了解正念活动安排',
    anchorCta: '留下 Zalo，了解安排',
    intro: '不必急着改变什么，先来认识一种生活方式。',
    sectionTitle: '从日常的一件小事开始',
    paths: [
      ['安心禅茶', '在泡茶、品茶之间，练习留意当下的感受，让一杯茶成为与自己相处的时光。'],
      ['正念体验', '通过太极正念球等活动，在身体的移动与停顿中，体会专注与觉察。'],
      ['静心文化', '从共读、交流与生活实践认识禅意生活，让学习不只停留在书本里。'],
    ],
    formTitle: '下一次静心时光，\n从这里开始。',
    formDescription: '留下姓名和 Zalo，方便小院与你联系，介绍近期正念活动的内容、时间与参加方式。',
    note: '咨询正念活动安排',
  },
  buddhism: {
    label: '佛学课程',
    eyebrow: '佛学 · 共读 · 次第修学',
    title: ['在北宁，', '让佛学走进生活。'],
    description:
      '从认识佛教文化，到理解生活中的问题。善明静心小院的佛学课程均为公益免费，通过学习、交流与实践，探索智慧与慈悲。',
    cta: '了解佛学课程安排',
    anchorCta: '留下 Zalo，了解安排',
    intro: '带着好奇与问题，开始一段有方向的学习。',
    sectionTitle: '从阅读与交流，走向系统学习',
    paths: [
      ['认识佛教文化', '通过主题共读与交流，接触佛学的基本观念，在学习中逐步建立自己的理解。'],
      ['回应人生问题', '围绕家庭、情感与生活中的追问，学习如何观察自己的观念与行为。'],
      [
        '有次第地修学',
        '了解小院有氛围、有次第、有方法、有引导的修学路径，把学习与日常实践连接起来。',
      ],
    ],
    formTitle: '想进一步了解，\n我们从一次交流开始。',
    formDescription: '留下姓名和 Zalo，方便小院与你联系，介绍佛学学习方向、课程安排与参加方式。',
    note: '咨询佛学课程安排',
  },
} as const

/** Zalo is collected explicitly as its registered phone number, never guessed. */
export function normalizeZaloPhone(input: string): string | null {
  const phone = input.trim().replace(/[\s().-]/g, '')
  return /^\+?\d{8,15}$/.test(phone) ? phone : null
}

/** First-party inquiry notes only. Never send contact details to analytics. */
export function campaignInquiryNotes(focus: CampaignFocus, search: string): string {
  const params = new URLSearchParams(search)
  const attribution = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].flatMap((key) => {
    const value = params
      .get(key)
      ?.replace(/[\r\n\t]/g, ' ')
      .slice(0, 120)
    return value ? [`${key}: ${value}`] : []
  })
  return [
    `广告落地页咨询：${campaignCopy[focus].note}`,
    '访客已同意小院通过 Zalo 联系并回复本次咨询。',
    ...attribution,
  ].join('\n')
}
