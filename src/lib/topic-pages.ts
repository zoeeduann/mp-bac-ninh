import type { Locale } from './i18n'

export const TOPIC_LAST_MODIFIED = '2026-07-07T00:00:00.000Z'

export type TopicSlug =
  | 'buddhism-thailand'
  | 'zen-meditation-bangkok'
  | 'meditation-chiangmai'
  | 'mindfulness-phuket'
  | 'tea-meditation-thailand'
  | 'buddhist-study-beginners'

type LocalizedText = Record<Locale, string>

export interface TopicFaq {
  question: LocalizedText
  answer: LocalizedText
}

export interface TopicPage {
  slug: TopicSlug
  citySlugs: string[]
  title: LocalizedText
  description: LocalizedText
  eyebrow: LocalizedText
  intro: LocalizedText
  keyPoints: LocalizedText[]
  faq: TopicFaq[]
  keywords: Record<Locale, string[]>
}

export const TOPIC_PAGES: TopicPage[] = [
  {
    slug: 'buddhism-thailand',
    citySlugs: ['bangkok', 'chiangmai', 'phuket'],
    title: {
      'zh-CN': '泰国佛学修学',
      en: 'Buddhist study in Thailand',
    },
    description: {
      'zh-CN':
        '静心学堂 · 泰国在曼谷、清迈、普吉提供佛学、佛法、禅修、正念、静坐、读书与一对一指导，多数活动免费，欢迎预约到访。',
      en: 'Mindfulpeace Academy Thailand offers Buddhist study, Dharma learning, Zen meditation, mindfulness, sitting practice, reading, and guidance in Bangkok, Chiang Mai, and Phuket.',
    },
    eyebrow: {
      'zh-CN': '佛学 · 佛法 · 生命觉醒教育',
      en: 'Buddhism · Dharma · contemplative education',
    },
    intro: {
      'zh-CN':
        '如果你正在泰国寻找可以亲近佛学、理解佛法并落实到生活中的修学空间，静心学堂 · 泰国在三座城市提供安静、开放、公益性的入口。',
      en: 'For people looking for Buddhist study in Thailand, Mindfulpeace Academy Thailand offers quiet, open, not-for-profit entry points in three cities.',
    },
    keyPoints: [
      {
        'zh-CN': '面向初学者，也适合希望把佛法带回日常生活的人。',
        en: 'Open to beginners and to people who want to bring Buddhist wisdom into daily life.',
      },
      {
        'zh-CN': '内容包括佛学读书、静坐、禅茶、正念练习与一对一指导。',
        en: 'Programs include Buddhist reading, sitting practice, tea meditation, mindfulness, and one-on-one guidance.',
      },
      {
        'zh-CN': '三处学堂位于曼谷、清迈与普吉，可按所在城市预约到访。',
        en: 'The academies are in Bangkok, Chiang Mai, and Phuket, with visits available by appointment.',
      },
    ],
    faq: [
      {
        question: {
          'zh-CN': '没有佛学基础可以参加吗？',
          en: 'Can beginners join Buddhist study activities?',
        },
        answer: {
          'zh-CN':
            '可以。静心学堂的活动以安顿身心和生活中的修学为入口，适合第一次接触佛学、禅修或正念的人。',
          en: 'Yes. The activities begin from settling body and mind in everyday life, so they are suitable for people new to Buddhism, Zen meditation, or mindfulness.',
        },
      },
      {
        question: {
          'zh-CN': '活动收费吗？',
          en: 'Are the activities paid?',
        },
        answer: {
          'zh-CN': '多数活动免费，部分活动需提前预约名额。具体安排以各活动页面为准。',
          en: 'Most activities are free, and some require advance booking because seats are limited. Please check each activity page for details.',
        },
      },
    ],
    keywords: {
      'zh-CN': ['泰国佛学', '泰国佛法', '泰国静心学堂', '佛学修学', '佛学读书会'],
      en: [
        'Buddhist study Thailand',
        'Buddhism Thailand',
        'Dharma learning Thailand',
        'Buddhist practice Thailand',
      ],
    },
  },
  {
    slug: 'zen-meditation-bangkok',
    citySlugs: ['bangkok'],
    title: {
      'zh-CN': '曼谷禅修与静坐',
      en: 'Zen meditation in Bangkok',
    },
    description: {
      'zh-CN':
        '曼谷如如学堂提供禅修、静坐、正念、禅茶、读书与身心安顿活动，适合在城市中寻找安静修学空间的人。',
      en: 'Ruru Academy in Bangkok offers Zen meditation, sitting practice, mindfulness, tea meditation, reading, and contemplative practice in the city.',
    },
    eyebrow: {
      'zh-CN': '曼谷 · 禅修 · 静坐',
      en: 'Bangkok · Zen meditation · sitting practice',
    },
    intro: {
      'zh-CN':
        '在曼谷市中心，静心学堂提供一处可以停下来、坐一坐、喝一杯茶、重新看见自己身心状态的修学空间。',
      en: 'In central Bangkok, the academy offers a place to pause, sit, share tea, and notice the state of body and mind.',
    },
    keyPoints: [
      {
        'zh-CN': '适合搜索“曼谷禅修”“Bangkok Zen meditation”“曼谷正念”的访客。',
        en: 'Relevant for people searching Bangkok Zen meditation, mindfulness Bangkok, or meditation in Bangkok.',
      },
      {
        'zh-CN': '活动形式包括静坐、读书、禅茶与正念练习。',
        en: 'Activities include sitting practice, reading, tea meditation, and mindfulness practice.',
      },
      {
        'zh-CN': '可通过活动页查看近期场次并预约。',
        en: 'Upcoming sessions and booking are available through the activity pages.',
      },
    ],
    faq: [
      {
        question: {
          'zh-CN': '曼谷学堂在哪里？',
          en: 'Where is the Bangkok academy?',
        },
        answer: {
          'zh-CN': '曼谷如如学堂位于 Rama IX Soi 7 一带，具体交通与联系信息可查看曼谷联系页。',
          en: 'Ruru Academy is around Rama IX Soi 7. Directions and contact details are available on the Bangkok contact page.',
        },
      },
      {
        question: {
          'zh-CN': '不会打坐可以参加吗？',
          en: 'Can I join if I do not know how to meditate?',
        },
        answer: {
          'zh-CN': '可以。活动会从安静坐下、观察呼吸与当下身心开始，不要求已有经验。',
          en: 'Yes. Practice starts from sitting quietly, observing breathing, and returning to the present; prior experience is not required.',
        },
      },
    ],
    keywords: {
      'zh-CN': ['曼谷禅修', '曼谷静坐', '曼谷正念', '曼谷打坐', '曼谷佛学'],
      en: [
        'Zen meditation Bangkok',
        'meditation Bangkok',
        'mindfulness Bangkok',
        'Buddhism Bangkok',
      ],
    },
  },
  {
    slug: 'meditation-chiangmai',
    citySlugs: ['chiangmai'],
    title: {
      'zh-CN': '清迈冥想、禅修与静坐',
      en: 'Meditation in Chiang Mai',
    },
    description: {
      'zh-CN':
        '清迈心灯学堂在山脚下提供冥想、禅修、静坐、正念、禅茶与读书活动，适合想在清迈安顿身心的访客。',
      en: 'Xindeng Academy in Chiang Mai offers meditation, Zen practice, sitting practice, mindfulness, tea meditation, and reading near the hills.',
    },
    eyebrow: {
      'zh-CN': '清迈 · 冥想 · 禅修',
      en: 'Chiang Mai · meditation · Zen practice',
    },
    intro: {
      'zh-CN': '清迈心灯学堂位于山脚下，更适合想放慢脚步、在自然气息中练习静坐、读书与禅茶的人。',
      en: 'Xindeng Academy sits near the hills of Chiang Mai, suited for people who want a slower space for sitting, reading, and tea meditation.',
    },
    keyPoints: [
      {
        'zh-CN': '适合“清迈冥想”“清迈禅修”“meditation Chiang Mai”等搜索意图。',
        en: 'A focused page for meditation Chiang Mai, Zen Chiang Mai, and mindfulness Chiang Mai search intent.',
      },
      {
        'zh-CN': '活动强调身心安顿、觉察练习与可持续的日常修学。',
        en: 'The activities emphasize settling body and mind, awareness practice, and sustainable daily cultivation.',
      },
      {
        'zh-CN': '可查看清迈学堂活动页，选择近期场次。',
        en: 'Visitors can review upcoming Chiang Mai sessions and choose a suitable date.',
      },
    ],
    faq: [
      {
        question: {
          'zh-CN': '清迈学堂适合短期旅行者吗？',
          en: 'Is the Chiang Mai academy suitable for short-term visitors?',
        },
        answer: {
          'zh-CN': '适合。只要活动仍有名额，旅行者也可以预约参加单次活动或到访了解。',
          en: 'Yes. Short-term visitors can book a single activity or arrange a visit when seats are available.',
        },
      },
      {
        question: {
          'zh-CN': '活动以中文还是英文进行？',
          en: 'Are activities in Chinese or English?',
        },
        answer: {
          'zh-CN': '多数内容以中文为主，部分活动与接待可中英文沟通，请以活动页面和联系回复为准。',
          en: 'Most activities are primarily in Chinese, with some bilingual support. Please check the activity page or contact the academy.',
        },
      },
    ],
    keywords: {
      'zh-CN': ['清迈冥想', '清迈禅修', '清迈静坐', '清迈正念', '清迈佛学'],
      en: [
        'meditation Chiang Mai',
        'Zen meditation Chiang Mai',
        'mindfulness Chiang Mai',
        'Buddhism Chiang Mai',
      ],
    },
  },
  {
    slug: 'mindfulness-phuket',
    citySlugs: ['phuket'],
    title: {
      'zh-CN': '普吉正念与静心体验',
      en: 'Mindfulness in Phuket',
    },
    description: {
      'zh-CN':
        '普吉和光小院提供正念、静坐、禅修、禅茶与身心安顿体验，适合在海岛寻找安静修学空间的人。',
      en: 'Heguang Courtyard in Phuket offers mindfulness, sitting practice, Zen meditation, tea meditation, and quiet contemplative visits.',
    },
    eyebrow: {
      'zh-CN': '普吉 · 正念 · 静心',
      en: 'Phuket · mindfulness · stillness',
    },
    intro: {
      'zh-CN':
        '普吉和光小院把海岛的光线、空气与一段向内的安静时光连接起来，适合想在旅行中安顿身心的人。',
      en: 'Heguang Courtyard connects island light, open air, and a quiet inward turn for people seeking mindfulness while in Phuket.',
    },
    keyPoints: [
      {
        'zh-CN': '适合搜索“普吉正念”“普吉冥想”“Phuket mindfulness”的访客。',
        en: 'Relevant for Phuket mindfulness, meditation Phuket, and contemplative practice Phuket queries.',
      },
      {
        'zh-CN': '活动可从静坐、正念、喝茶和轻松到访开始。',
        en: 'Practice may begin with sitting, mindfulness, tea, and a gentle visit.',
      },
      {
        'zh-CN': '可通过普吉学堂页面查看联系方式与近期安排。',
        en: 'Visitors can use the Phuket academy page for contact details and current programs.',
      },
    ],
    faq: [
      {
        question: {
          'zh-CN': '普吉学堂适合游客吗？',
          en: 'Is the Phuket academy suitable for travelers?',
        },
        answer: {
          'zh-CN': '适合。可以从短时间到访、正念体验或单次活动开始。',
          en: 'Yes. Travelers can begin with a short visit, a mindfulness experience, or a single activity.',
        },
      },
      {
        question: {
          'zh-CN': '需要提前预约吗？',
          en: 'Do I need to book in advance?',
        },
        answer: {
          'zh-CN': '建议提前预约，以便义工确认场次、地址与接待安排。',
          en: 'Advance booking is recommended so volunteers can confirm the session, address, and reception arrangement.',
        },
      },
    ],
    keywords: {
      'zh-CN': ['普吉正念', '普吉冥想', '普吉禅修', '普吉静心', '普吉佛学'],
      en: ['mindfulness Phuket', 'meditation Phuket', 'Zen meditation Phuket', 'Buddhism Phuket'],
    },
  },
  {
    slug: 'tea-meditation-thailand',
    citySlugs: ['bangkok', 'chiangmai', 'phuket'],
    title: {
      'zh-CN': '泰国禅茶与静心茶会',
      en: 'Tea meditation in Thailand',
    },
    description: {
      'zh-CN':
        '静心学堂 · 泰国在三处学堂提供禅茶、静心茶会、读书与正念练习，让喝茶成为安顿身心的入口。',
      en: 'Mindfulpeace Academy Thailand offers tea meditation, mindful tea gatherings, reading, and awareness practice in Bangkok, Chiang Mai, and Phuket.',
    },
    eyebrow: {
      'zh-CN': '禅茶 · 读书 · 正念',
      en: 'Tea meditation · reading · mindfulness',
    },
    intro: {
      'zh-CN':
        '禅茶不是表演，而是在一杯茶的时间里回到呼吸、动作、关系与当下，适合希望以轻松方式接触静心的人。',
      en: 'Tea meditation is not a performance; it is a way to return to breathing, movement, relationship, and the present through a cup of tea.',
    },
    keyPoints: [
      {
        'zh-CN': '适合“禅茶”“茶禅”“tea meditation Thailand”等搜索意图。',
        en: 'A focused entry for tea meditation, mindful tea, and tea ceremony practice in Thailand.',
      },
      {
        'zh-CN': '常与读书、分享、静坐或正念练习结合。',
        en: 'Often paired with reading, sharing, sitting practice, or mindfulness exercises.',
      },
      {
        'zh-CN': '三处学堂活动安排不同，可按城市查看。',
        en: 'Schedules differ by city, so visitors can explore programs by academy.',
      },
    ],
    faq: [
      {
        question: {
          'zh-CN': '禅茶需要懂茶吗？',
          en: 'Do I need to know tea culture to join?',
        },
        answer: {
          'zh-CN': '不需要。重点不是茶艺知识，而是通过喝茶练习觉察与安住。',
          en: 'No. The emphasis is not tea expertise, but awareness and settling through the act of drinking tea.',
        },
      },
      {
        question: {
          'zh-CN': '禅茶适合第一次参加静心活动的人吗？',
          en: 'Is tea meditation suitable for a first visit?',
        },
        answer: {
          'zh-CN': '适合。禅茶通常比长时间静坐更容易进入，是温和的入门方式。',
          en: 'Yes. Tea meditation is often a gentle first step and can be easier to enter than long sitting practice.',
        },
      },
    ],
    keywords: {
      'zh-CN': ['泰国禅茶', '曼谷禅茶', '清迈禅茶', '普吉禅茶', '静心茶会'],
      en: [
        'tea meditation Thailand',
        'tea meditation Bangkok',
        'tea meditation Chiang Mai',
        'mindful tea Thailand',
      ],
    },
  },
  {
    slug: 'buddhist-study-beginners',
    citySlugs: ['bangkok', 'chiangmai', 'phuket'],
    title: {
      'zh-CN': '初学者佛学与禅修入门',
      en: 'Buddhist study and meditation for beginners',
    },
    description: {
      'zh-CN':
        '面向初学者的佛学、佛法、禅修、正念、静坐与身心安顿入口。可在曼谷、清迈、普吉选择适合自己的学堂和活动。',
      en: 'An entry point for beginners in Buddhist study, Dharma, Zen meditation, mindfulness, sitting practice, and contemplative life in Thailand.',
    },
    eyebrow: {
      'zh-CN': '初学者 · 佛学 · 禅修',
      en: 'Beginners · Buddhist study · meditation',
    },
    intro: {
      'zh-CN':
        '很多人第一次接触佛学或禅修时，会担心听不懂、坐不住、没有基础。静心学堂更关心的是从当下身心开始，慢慢建立自己的修学节奏。',
      en: 'Many beginners worry that they do not understand Buddhism or cannot sit still. The academy begins from the present body and mind, helping each person find a sustainable rhythm.',
    },
    keyPoints: [
      {
        'zh-CN': '适合没有佛学、禅修或冥想基础的人。',
        en: 'Suitable for people without prior Buddhist study, Zen meditation, or mindfulness experience.',
      },
      {
        'zh-CN': '可以从读书会、禅茶、短时静坐或参观开始。',
        en: 'A first step may be a reading group, tea meditation, short sitting practice, or a visit.',
      },
      {
        'zh-CN': '若不确定参加哪个活动，可以先联系最近的学堂。',
        en: 'If unsure which activity to join, contact the nearest academy first.',
      },
    ],
    faq: [
      {
        question: {
          'zh-CN': '初学者应该先参加什么？',
          en: 'What should a beginner join first?',
        },
        answer: {
          'zh-CN': '可以先从读书会、禅茶、短时静坐或参观开始。若不确定，可联系最近的学堂。',
          en: 'A reading group, tea meditation, short sitting practice, or visit is a good first step. Contact the nearest academy if unsure.',
        },
      },
      {
        question: {
          'zh-CN': '需要信仰佛教才能参加吗？',
          en: 'Do I need to be Buddhist to join?',
        },
        answer: {
          'zh-CN': '不需要。静心学堂以开放的方式提供佛学智慧和身心安顿练习，欢迎真诚想学习的人。',
          en: 'No. The academy offers Buddhist wisdom and practices for settling body and mind in an open way, welcoming sincere learners.',
        },
      },
    ],
    keywords: {
      'zh-CN': ['佛学入门', '禅修入门', '初学者禅修', '初学者佛学', '正念入门'],
      en: [
        'Buddhist study for beginners',
        'meditation for beginners Thailand',
        'Zen meditation beginners',
        'mindfulness beginners',
      ],
    },
  },
]

export function getTopicPage(slug: string): TopicPage | undefined {
  return TOPIC_PAGES.find((topic) => topic.slug === slug)
}

export function topicPath(slug: string): string {
  return `/topics/${slug}`
}

export function topicText(value: LocalizedText, locale: Locale): string {
  return value[locale]
}
