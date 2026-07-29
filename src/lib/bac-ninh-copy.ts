import type { Locale } from './i18n'

const copy = {
  'zh-CN': {
    story: [
      '善明小院由一群志同道合的伙伴共同建设。我们致力于传承与分享静心文化，让更多人在日常生活中感受到正念、清明与慈悲的力量。',
      '在越南北宁，我们以“禅意生活、智慧人生、觉醒之道”为修学脉络，营造一个开放、安静、彼此支持的学习空间。这里既关照现实生活，也回应内心更深的追问。',
    ],
    signature: '禅意生活、智慧人生、觉醒之道。',
    pathEyebrow: '修学路径',
    pathHeading: '从日常生活，走向内在觉醒',
    pathIntro:
      '三条彼此相连的修学路径，从生活体验到智慧学习，再到系统而有次第的生命教育。',
    paths: [
      {
        title: '禅意生活',
        subtitle: '一种富有精神内涵的物质生活',
        description:
          '将东方禅意融入现代生活，通过安心禅茶、静心蔬食、太极正念球、静心整理与养生按导等体验，放慢节奏，让心安静下来，感受内在的自然与清明。',
      },
      {
        title: '智慧人生',
        subtitle: '面对现实问题，也回应生命的长远追问',
        description:
          '围绕家庭、财富、情感等现实课题，以及“我是谁”“生命为何”等追问，通过学习与交流建立正确认识，寻找直面人生的智慧。',
      },
      {
        title: '觉醒之道',
        subtitle: '让佛法不再难学',
        description:
          '以有氛围、有次第、有方法、有引导的课程体系，帮助现代学人系统学习佛教文化，在日常中培养正念与慈悲，走上生命觉醒之道。',
      },
    ],
    mpiEyebrow: '品牌背景',
    mpiHeading: '国际静心协会（MPI）',
    mpiParagraphs: [
      '国际静心协会（Mindful Peace International，简称 MPI）注册于瑞士苏黎世，是一个致力于在全球范围内分享佛教优秀传统文化与禅意生活的非营利组织。',
      '协会围绕生命觉醒教育，发展“静心学堂”“静心小院”“安心茶室”等公益品牌，让更多人得以接触这一延续两千多年的生命智慧。',
    ],
  },
  en: {
    story: [
      'Mindful Peace Yard Bac Ninh is built by a community brought together by a shared aspiration. We are committed to carrying forward Mindful Peace culture so that more people can experience mindfulness, clarity, and universal compassion in everyday life.',
      'In Bac Ninh, our learning unfolds through three connected paths: Chan-inspired living, wisdom in life, and the path to awakening. Together they create an open, quiet, and supportive space for practical living and deeper inquiry.',
    ],
    signature: 'Chan-inspired living, wisdom in life, and the path to awakening.',
    pathEyebrow: 'Learning paths',
    pathHeading: 'From everyday living to inner awakening',
    pathIntro:
      'Three connected paths lead from lived experience to wisdom and a gradual, guided education in awakening.',
    paths: [
      {
        title: 'Chan-inspired Living',
        subtitle: 'Enriching material life with spiritual essence',
        description:
          'By bringing Eastern Chan wisdom into modern life through Dhyana Tea, mindful food, Tai Chi Mindfulness Ball, mindful decluttering, and wellbeing practices, we slow down, quiet the mind, and reconnect with innate clarity.',
      },
      {
        title: 'Wisdom in Life',
        subtitle: 'Responding to practical and ultimate questions',
        description:
          'We explore everyday concerns such as family, finances, and relationships alongside deeper questions of identity and purpose, cultivating right understanding and practical wisdom through study and dialogue.',
      },
      {
        title: 'Path to Awakening',
        subtitle: 'Making the Buddhist Dharma easier to learn',
        description:
          'A curriculum grounded in atmosphere, gradual progression, practical methods, and compassionate guidance helps modern learners study Buddhist culture systematically and cultivate mindfulness and compassion in daily life.',
      },
    ],
    mpiEyebrow: 'Our roots',
    mpiHeading: 'Mindful Peace International (MPI)',
    mpiParagraphs: [
      'Registered in Zurich, Switzerland, Mindful Peace International is a global non-profit organization dedicated to sharing the rich heritage of Buddhism and Chan-inspired living.',
      'Centered on life-awakening education, MPI develops public benefit initiatives including Mindful Peace Academy, Mindful Peace Yards, and Dhyana Tea, opening this living tradition of more than two thousand years to more people.',
    ],
  },
} as const

export function getBacNinhBrandCopy(locale: Locale) {
  return copy[locale]
}
