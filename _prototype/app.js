const STRINGS = {
  en: {
    footerBlurb:
      "A quiet academy space in Chiang Mai for everyday practice, tea, reading, and shared presence.",
    footerExplore: "Explore",
    footerContact: "Contact",
    footerUpdates: "Quiet Updates",
    subscribe: "Subscribe",
    footerCredit: "Built from Stitch screens and expanded into a functional site.",
    bookingEyebrow: "Reservation",
    formName: "Name",
    formEmail: "Email",
    formDate: "Preferred date",
    formGuests: "Guests",
    formNotes: "Intentions or notes",
    confirmBooking: "Confirm booking",
    readMore: "Read more",
    learnMore: "Learn more",
    bookVisit: "Book a visit",
    viewCalendar: "View calendar",
    comingSoon: "We will reply with availability and next steps within 24 hours.",
    filterAll: "All",
  },
  zh: {
    footerBlurb: "位于清迈的静心空间，围绕日常修习、茶、阅读与共处展开。",
    footerExplore: "探索",
    footerContact: "联系",
    footerUpdates: "学堂通讯",
    subscribe: "订阅",
    footerCredit: "基于 Stitch 设计稿扩展为完整功能网站。",
    bookingEyebrow: "预约",
    formName: "姓名",
    formEmail: "邮箱",
    formDate: "意向日期",
    formGuests: "人数",
    formNotes: "想法与备注",
    confirmBooking: "提交预约",
    readMore: "继续阅读",
    learnMore: "了解详情",
    bookVisit: "预约来访",
    viewCalendar: "查看日历",
    comingSoon: "我们会在 24 小时内回复可约时间与下一步安排。",
    filterAll: "全部",
  },
};

const NAV_ITEMS = [
  { route: "home", en: "Home", zh: "首页" },
  { route: "about", en: "About", zh: "关于学堂" },
  { route: "calendar", en: "Calendar", zh: "活动日历" },
  { route: "experiences", en: "Experiences", zh: "深度体验" },
  { route: "join", en: "Ways to Join", zh: "加入我们" },
  { route: "faq", en: "FAQ", zh: "常见问题" },
  { route: "journal", en: "Journal", zh: "随笔随记" },
  { route: "book", en: "Book", zh: "预约咨询" },
];

const SITE = {
  heroImages: {
    home: "https://lh3.googleusercontent.com/aida-public/AB6AXuCkksE6X1RHOfbjfcPV6X1ps_kG2GGNjIWgzkYX9JeiDemJHZNt9i1NiTTSMeTRGipO2YrDKi7n2EREPK7yp-HE39KxaRq5kurLerRx8W8lu6Ly1dwq-nANQwIzGFtAGbv6Ch2MsAA9PiPHBHaKbhyTHlIYUjtXH5ytr0QV3mybUnIey3eQHMjdawm4DJ2dcHlFWwxPkWPlN9q0TrR47reRmuwvmoCFed58WSzyKe0gQ4RsLYgTuAYPeGUT_ZKjuuX_T16mzqXmfgD8",
    about: "https://lh3.googleusercontent.com/aida-public/AB6AXuCBPO3GJ6lkPHrd9g_EhRWjDOFIo5MC5VxkuiHnDduFi0mVhR0vhLdC4AncmxCaCEIcbLRLFbg61aGBO4NapdTRstRvgCh8lgpDlJjhiOkWf8Mj5Yooia7cCZiXyl7u8TqRpajmEm3zwqMX-8fsHYuDS_GdZX1ULyRXY7hEW0dgEQ-pdawzPCAspeFfZJZx-A88ayspe2kHuOOHt9PiKyYlmgjY6DCpftof8FrXrGVWvLqc3EXDMRveUCQFBBP5nAkSiuenO6wz_UeS",
    calendar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBmOcmWktjcUTgI1G-_EPOOxI7R5khbxjw4fMVndUWkwX1hSihZyFNdyumpBsTp-lwT8wc5-QpDLJlKwfeK9pCUYjZxnPZcykCGcw-Qj-1rrYOZ_pqXgfkz8WmbDUxU0bkXV0aos138pVb3pEBVussoQIumFPy6kMzBRdI0Qw362sfbk05E3cHvQJB4F6K4In3S0FS74Bt9unurgzH3DjofQcF94Sg70x0YzkZXVa0GysbJ7TNlqhvmseKxEj8w3hC5toBIVsjfvAwb",
    experiences:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDCTU4FR0JLdz6jt16ADNEvl21tzyYLNZKPC0i0f-uWpDx4umPbmRvZklc3P-K3j_09UaCxUdGvaHeKsh_qdeZFTPJPtFM6n7mEGLKl6lXXZDrSuOTiACF4f8mgovom-lyDu04T9d3T3RLF3xRkcGtSlOhSAe7UWoVQcItVWl0DOQSzpU6Cl7b4Pj_sThBnksMHZ8CnhNdvdfw4xrNhF9SSCrcxB5LAYkqfaIvv8yiRW9qI98XWdrzhe39z_-ffDCXifT77FXVKFgPP",
    join: "https://lh3.googleusercontent.com/aida-public/AB6AXuCV_tTl4WkJsn2ZvX0IhfXTQioGYpWIrYnX48NJ_-BkXFOzLum7M85K2sTdfvatTOJ0dFVg3sakG8UEzaA8x3dBFEangiQy7gSPga-1oTtf2YEzAi3Zeo6qrrfcYbDasgYUMFeTUkIo1Qzosgt9Sm0RTeFFeeYY8_h6YuGAs-0RVFRzv3uchlkYZ_aOiUYmMCv90TBQ9pebS-iDCiNDUz0-ElUbgXK14G4onnsN1q_bNh1QuAYjS7xI3Jd2KHx6v1B1RoAf-ihBzyuU",
    faq: "https://lh3.googleusercontent.com/aida-public/AB6AXuCEGbLp0XSzOFsPxeJCVC4Es4j0E8UQgImSQHd_ordsGoyqyqOlYr_PGZ5c70XdRwRTnlrtjJM8eagMrX4fgWreKk47PQKMeyzpYUDATl-tqM_vXFbJG6OGsks9TP3gOoA7h01VprkO-PkyTqwwwRaIB5WxWh_Q6GyZzjXhd8B5A-HsJ2EWmQI9foB8tvkOUiLHaz6loW4lJQRSIzoRjrsU39IgSsXVCmDlJsDP1QiN0AryKIwF9KMPWf8UANPRISCkWQPBipXxN-Jy",
    journal:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAygnjsCdelKIwVnDBeM7qjaAFUy5ieOLg92c4UOlEjwPWYKbLmzeS9LhzGaVOdYKpAKGsVbpdkEOjmyuTpg0DKeMlQMrjVsMUoiQxTjUYdr-zqeAV1zkAd17v-m_X0LBHS0icLSlVnI0GfOHGDOVMAxESl5kePgDEdSNl2hCPVvS_kzzYU6mVyb6ja4WwB4_Prpytl-W4HfZkaxZX6QO4pWcSz5PFA6ycnFp67jSTeKxTo1BOgvASaMcsgthuLLtrAh4GPXVtpZlgf",
    book: "https://lh3.googleusercontent.com/aida-public/AB6AXuA45IlwY1hrA6t2BoAXV8lJ3w4A2uXkdzBqO4jzWZMWQiuIGWzEid5MsZsz4k4dOX3dyc4Awe_dqAzfJhqJ_wUcQI2ZLZy4rfz7NoEt_YjOP1fqHrTvYjT7cCHEkwJXRzkzf9VmOgphKPtuLvCD51Uby-s8XfC0GThmcBoCzhSS2yvFLouUFMneO1W6Qvk9pygjPc8ZcU_-_7uEQmfxJ5Gr6WR9EXAGFKiU7t5C1ui0djtMneylWu3_Qs5UvmJRsSM35JBH971QyDBA",
  },
  metrics: [
    { en: "7 routes", zh: "7 个主要页面", detailEn: "Unified as one coherent website", detailZh: "整合为一个统一站点" },
    { en: "2 languages", zh: "双语体验", detailEn: "English and Simplified Chinese", detailZh: "英文与简体中文切换" },
    { en: "24h reply", zh: "24 小时回复", detailEn: "Booking flow with local confirmation", detailZh: "预约表单与本地确认" },
  ],
  philosophy: [
    {
      en: "Grounded Quietude",
      zh: "安住与沉静",
      bodyEn:
        "The academy is not framed as escape. It is a return to rhythm through tea, reading, shared meals, mindful movement, and long, intentional pauses.",
      bodyZh:
        "学堂并不鼓励逃离生活，而是通过茶、阅读、共食、步行与留白，把人带回更有秩序的日常节律。",
    },
    {
      en: "Eastern Wisdom in Practice",
      zh: "东方智慧的当代表达",
      bodyEn:
        "The project language from Stitch consistently places Chan-inspired living at the center: direct experience, less performance, and fewer layers between body and mind.",
      bodyZh:
        "从 Stitch 的页面内容来看，学堂的核心是禅意生活：重视直接经验，减少表演感，让身心关系更直接。",
    },
    {
      en: "Community as Method",
      zh: "以共处为方法",
      bodyEn:
        "Shared presence is not decorative copy. It is a recurring structure across the pages, from family participation to journaling, retreats, and weekly gatherings.",
      bodyZh:
        "“共处”并不是点缀性的文案，而是贯穿所有页面的结构，从家庭活动、随笔、体验项目到每周日程都体现出来。",
    },
  ],
  experiencePrograms: [
    {
      id: "stillness",
      tag: "intro",
      titleEn: "A Morning of Stillness",
      titleZh: "静心早晨体验",
      metaEn: "3 hours · Meditation, walking, private tea instruction",
      metaZh: "3 小时 · 坐禅、经行、私享茶席",
      bodyEn:
        "A gentle doorway into the academy for first-time visitors who want a structured but unhurried introduction.",
      bodyZh: "为第一次来到学堂的人准备的温和入口，既有引导，也保留松弛感。",
    },
    {
      id: "present-moment",
      tag: "arts",
      titleEn: "Art of the Present Moment",
      titleZh: "当下之艺",
      metaEn: "5 hours · Zen calligraphy, mindful movement, tea",
      metaZh: "5 小时 · 禅意书写、身心舒展、茶",
      bodyEn:
        "Designed for guests who want a more tactile experience of attention through brushwork, breath, and embodied pacing.",
      bodyZh: "适合希望通过书写、呼吸与动作节律感受专注的人。",
    },
    {
      id: "residency",
      tag: "immersion",
      titleEn: "Residency Inquiry",
      titleZh: "驻留申请",
      metaEn: "1–3 months · community work, study, practice",
      metaZh: "1–3 个月 · 共住、劳作、修习",
      bodyEn:
        "For dedicated practitioners seeking depth. Applications are reviewed after an initial visit and conversation.",
      bodyZh: "面向希望深入修习的人，通常需先完成来访与沟通。",
    },
  ],
  activities: [
    {
      id: "zazen",
      category: "quiet",
      titleEn: "Daily Zazen",
      titleZh: "每日坐禅",
      date: "2026-04-20",
      timeEn: "06:30 & 18:00",
      timeZh: "06:30 与 18:00",
      placeEn: "Meditation Hall",
      placeZh: "静坐堂",
      bodyEn: "Guided and silent meditation at dawn and dusk, open to all experience levels.",
      bodyZh: "清晨与黄昏的引导式与静默坐禅，对所有程度开放。",
    },
    {
      id: "tea",
      category: "tea",
      titleEn: "Traditional Afternoon Tea",
      titleZh: "午后茶会",
      date: "2026-04-23",
      timeEn: "14:00 – 16:00",
      timeZh: "14:00 – 16:00",
      placeEn: "Tea Studio",
      placeZh: "茶室",
      bodyEn: "Shared silence and tea tasting with reflections on sensory attention.",
      bodyZh: "在静默中品茶，感受感官如何被慢慢打开。",
    },
    {
      id: "walking",
      category: "walking",
      titleEn: "Mindful Walking",
      titleZh: "正念经行",
      date: "2026-04-25",
      timeEn: "08:00 – 09:15",
      timeZh: "08:00 – 09:15",
      placeEn: "Forest Path",
      placeZh: "林间步道",
      bodyEn: "A moving meditation through shaded paths in Mae Rim, synchronizing breath and step.",
      bodyZh: "在美林林间步道中，随着呼吸和步伐一起慢下来。",
    },
    {
      id: "family",
      category: "family",
      titleEn: "Mindful Play for Families",
      titleZh: "亲子静心工作坊",
      date: "2026-04-27",
      timeEn: "10:00 – 12:00",
      timeZh: "10:00 – 12:00",
      placeEn: "Garden Pavilion",
      placeZh: "花园亭",
      bodyEn: "Playful attention practices using natural materials, quiet observation, and shared tea.",
      bodyZh: "用自然材料、静观和共享茶席，让孩子与父母一起练习专注。",
    },
    {
      id: "reading",
      category: "reading",
      titleEn: "Philosophical Reading Circle",
      titleZh: "哲学阅读会",
      date: "2026-04-29",
      timeEn: "18:30 – 20:00",
      timeZh: "18:30 – 20:00",
      placeEn: "Library Room",
      placeZh: "藏书室",
      bodyEn: "A slow reading circle around tea, text, and discussion on clarity in ordinary life.",
      bodyZh: "围绕茶、文本与对话展开的缓慢阅读夜。",
    },
    {
      id: "retreat",
      category: "immersion",
      titleEn: "Weekend Quiet Retreat",
      titleZh: "周末静修",
      date: "2026-05-03",
      timeEn: "Fri 16:00 – Sun 14:00",
      timeZh: "周五 16:00 至周日 14:00",
      placeEn: "Residency Wing",
      placeZh: "驻留院落",
      bodyEn: "A lightly structured weekend of silence, tea, and guided reflection for deeper reset.",
      bodyZh: "包含静默、茶席与引导式反思的周末深度修习。",
    },
  ],
  faq: [
    {
      category: "philosophy",
      questionEn: "Is this a religious place?",
      questionZh: "这里是宗教场所吗？",
      answerEn:
        "The academy is first a quiet space for contemporary life. It is shaped by eastern wisdom traditions and open to guests of different backgrounds.",
      answerZh:
        "学堂首先是一个面向当代生活的安静空间，受东方智慧启发，但对不同背景的人都开放。",
    },
    {
      category: "philosophy",
      questionEn: "Can I come with no experience?",
      questionZh: "没有经验也可以来吗？",
      answerEn:
        "Yes. Many visitors are beginners. The first-visit path is intentionally simple, with gentle orientation and clear etiquette.",
      answerZh: "可以。很多来访者都是第一次接触，这里的新手路径设计得很温和清楚。",
    },
    {
      category: "practical",
      questionEn: "What language support is available?",
      questionZh: "支持哪些语言？",
      answerEn:
        "The core experience is offered in English and Simplified Chinese. Booking communication and orientation can be bilingual.",
      answerZh: "主要支持英文与简体中文，预约沟通与到访介绍都可以双语进行。",
    },
    {
      category: "practical",
      questionEn: "Are there activities for families?",
      questionZh: "有适合家庭的活动吗？",
      answerEn:
        "Yes. Family stillness workshops are designed for parents and children, while deeper silent retreats are usually adult-focused.",
      answerZh: "有。亲子工作坊适合父母与孩子一起参加，较深度的静修则通常以成年人为主。",
    },
    {
      category: "booking",
      questionEn: "How far in advance should I book?",
      questionZh: "建议提前多久预约？",
      answerEn:
        "For day visits, one week is usually enough. Weekend retreats and immersive programs are best booked two to three weeks ahead.",
      answerZh: "日间来访通常提前一周即可，周末静修或沉浸式项目建议提前两到三周。",
    },
    {
      category: "booking",
      questionEn: "Where are you located?",
      questionZh: "学堂在哪里？",
      answerEn:
        "The academy is based in Mae Rim District, about 30 minutes north of Chiang Mai city, with shuttle guidance available after confirmation.",
      answerZh:
        "学堂位于清迈美林区，距离市区约 30 分钟车程，确认预约后会提供接驳与路线指引。",
    },
  ],
  journal: [
    {
      id: "tea-ritual",
      category: "tea",
      titleEn: "The quiet art of brewing morning tea",
      titleZh: "清晨沏茶的安静技艺",
      excerptEn:
        "How the first pot of tea sets the emotional temperature of the day, and why repetition can become a form of care.",
      excerptZh: "第一壶茶如何决定一天的心境，又为什么重复的动作会成为一种照料。",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAygnjsCdelKIwVnDBeM7qjaAFUy5ieOLg92c4UOlEjwPWYKbLmzeS9LhzGaVOdYKpAKGsVbpdkEOjmyuTpg0DKeMlQMrjVsMUoiQxTjUYdr-zqeAV1zkAd17v-m_X0LBHS0icLSlVnI0GfOHGDOVMAxESl5kePgDEdSNl2hCPVvS_kzzYU6mVyb6ja4WwB4_Prpytl-W4HfZkaxZX6QO4pWcSz5PFA6ycnFp67jSTeKxTo1BOgvASaMcsgthuLLtrAh4GPXVtpZlgf",
    },
    {
      id: "quiet-places",
      category: "space",
      titleEn: "Quiet places in Chiang Mai for time alone",
      titleZh: "清迈适合独处的安静角落",
      excerptEn:
        "From teak libraries to streamside benches, these are the places that support unforced reflection.",
      excerptZh: "从柚木书架到溪边长椅，这些空间帮助人自然地慢下来。",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAq308nO4TYBYTMXkYqSBzQ1ItvCXEOmvZrSV1fHa6w1LOG6jHsoIcVqCy1dab2nIEITSwiFlS4GYQrck8cd60c4OfK4IAN27qg0zzt-epdb9JrIlzwO7l7LhbvKs0VK_NyNQLvTZPeVKSBk0_mLvWTmB6iRrWqrk0VKIMorOhsZZVzYORTcbTx1YQ7T3-Aj42NYB0RUUL30PW-QI_P7fBkTPtkoTaRHGrAR2lCZwTRk0PeUCNnDj6KIPAZKgwjUz2m8nBM3J5az1tX",
    },
    {
      id: "family-practice",
      category: "community",
      titleEn: "Family participation at the academy",
      titleZh: "家庭如何参与学堂生活",
      excerptEn:
        "What mindful play looks like across generations, and how children encounter silence through texture, rhythm, and garden work.",
      excerptZh: "跨代正念活动如何发生，孩子又如何通过节奏、触感与园艺接近安静。",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBVyYEiAkh8UdzB1a7QMGD_cih_7LuuvzOlzX_46NB_m1rj0N2Z1rjo_7JYi5ozXzlTpEW256gs5h5lLOpGFUUcHEEOET8_H3EqfTnOUPwC_mROr7gXXNm1IagW05gIrAWkJEPQRxctMI_I11cwS3MNH6ndScndeGvUAtem_862TffmNc9jH55UR2bxcA9lnxpEqFkyA6pDLVsOpLMH53uTQtnITf4cnXEl541geCRR_tORkClKUd2nj8VhaylvqplfQSpK0kKYd1eP",
    },
    {
      id: "daily-practice",
      category: "practice",
      titleEn: "Daily practice beyond the academy walls",
      titleZh: "离开学堂之后，如何继续练习",
      excerptEn:
        "Simple structures for carrying tea, reading, and mindful pacing into work and domestic life.",
      excerptZh: "如何把茶、阅读与步调感，带回工作与家庭生活。",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDW6ttbQOvhUSXZTZ59C98vO20ejYdvSYry54WH24mMn6Z_hOqW4aK7lts4PrU1g8_9oXEcyLS3lkE4WoOYaj8sSVzRBTtZ9vWKgfVqZJVoY3jRK-4-pU06S_2ps_hhtoZhtUIhGMryKUe7Gk-cyBDxOkzeEoM6_lOSLP38M9oJtMjAMMROOcg8cgc1dmkzZzfeAA2QbjkIQ7D5qfklr7nGwanEKR2wjMvqsYtqQ1Azk2egVc_KsZT1qLMtZSaB-biujvES9XiXEMdV",
    },
  ],
  programs: [
    {
      id: "first-visit",
      titleEn: "First Visit Consultation",
      titleZh: "首次来访咨询",
      summaryEn: "For guests who want a simple guided introduction to the academy rhythm.",
      summaryZh: "适合第一次到学堂，希望先了解整体节奏的人。",
    },
    {
      id: "day-experience",
      titleEn: "Day Experience",
      titleZh: "日间体验",
      summaryEn: "Tea, meditation, walking, and orientation woven into a single day.",
      summaryZh: "茶、静坐、经行与空间介绍，整合为一整天的体验。",
    },
    {
      id: "retreat-program",
      titleEn: "Retreat / Residency Inquiry",
      titleZh: "静修 / 驻留申请",
      summaryEn: "For those considering a deeper relationship with the academy.",
      summaryZh: "面向希望与学堂建立更长期关系的人。",
    },
  ],
};

const state = {
  lang: localStorage.getItem("jingxin-lang") || "en",
  bookings: JSON.parse(localStorage.getItem("jingxin-bookings") || "[]"),
  newsletter: JSON.parse(localStorage.getItem("jingxin-newsletter") || "[]"),
  route: getRoute(),
  calendarFilter: "all",
  journalFilter: "all",
  faqQuery: "",
  selectedProgram: null,
};

const app = document.getElementById("app");
const nav = document.getElementById("main-nav");
const mobileNav = document.getElementById("mobile-nav");
const footerLinks = document.getElementById("footer-links");
const langToggle = document.getElementById("lang-toggle");
const menuToggle = document.getElementById("menu-toggle");
const bookingModal = document.getElementById("booking-modal");
const bookingTitle = document.getElementById("booking-title");
const bookingDescription = document.getElementById("booking-description");
const bookingSummary = document.getElementById("booking-summary");
const bookingShell = document.getElementById("booking-shell");
const bookingStatus = document.getElementById("booking-status");
const newsletterForm = document.getElementById("newsletter-form");
const newsletterStatus = document.getElementById("newsletter-status");

function t(key) {
  return STRINGS[state.lang][key] || STRINGS.en[key] || key;
}

function getRoute() {
  return (window.location.hash || "#home").slice(1);
}

function navLabel(item) {
  return state.lang === "zh" ? item.zh : item.en;
}

function renderNav() {
  const links = NAV_ITEMS.map(
    (item) =>
      `<a class="nav-link ${state.route === item.route ? "active" : ""}" href="#${item.route}">${navLabel(item)}</a>`,
  ).join("");
  nav.innerHTML = links;
  mobileNav.innerHTML = links;
  footerLinks.innerHTML = NAV_ITEMS.map(
    (item) => `<a href="#${item.route}">${navLabel(item)}</a>`,
  ).join("");
  langToggle.textContent = state.lang === "en" ? "EN / 中文" : "中文 / EN";
  document.documentElement.lang = state.lang === "en" ? "en" : "zh";
}

function heroTemplate({ eyebrow, title, lede, note, image, actions = "" }) {
  return `
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">${eyebrow}</span>
        <h1>${title}</h1>
        <p class="lede">${lede}</p>
        ${actions ? `<div class="hero-actions">${actions}</div>` : ""}
      </div>
      <div class="hero-side">
        <div class="hero-visual" style="background-image:url('${image}')" data-note="${note}"></div>
      </div>
    </section>
  `;
}

function metricTemplate(metric) {
  return `
    <div class="metric">
      <div class="metric-value">${state.lang === "zh" ? metric.zh : metric.en}</div>
      <div class="muted">${state.lang === "zh" ? metric.detailZh : metric.detailEn}</div>
    </div>
  `;
}

function renderHome() {
  return `
    <div class="page">
      ${heroTemplate({
        eyebrow: state.lang === "zh" ? "清迈 · 安住与留白" : "Chiang Mai · Slower rhythm",
        title:
          state.lang === "zh"
            ? "在清迈，为更清明的日常腾出一处安静空间"
            : "A quiet space in Chiang Mai for slower, clearer living",
        lede:
          state.lang === "zh"
            ? "这个网站综合了 Stitch 中的首页、关于、体验、加入我们、FAQ、日历与随笔页面，整理成一个真正可预约、可浏览、可持续扩展的学堂网站。"
            : "This site consolidates the Stitch home, about, experiences, join, FAQ, calendar, and journal screens into one functional website with booking, browsing, and content flows.",
        note:
          state.lang === "zh"
            ? "核心氛围来自 Stitch 设计：沉静留白、自然材质、双语并置、东方智慧与现代生活之间的缓慢连接。"
            : "The visual language follows the Stitch screens: quiet space, natural materials, bilingual pacing, and a slower bridge between eastern wisdom and contemporary life.",
        image: SITE.heroImages.home,
        actions: `
          <a class="primary-button" href="#book">${t("bookVisit")}</a>
          <a class="ghost-button" href="#calendar">${t("viewCalendar")}</a>
        `,
      })}
      <section class="metrics">${SITE.metrics.map(metricTemplate).join("")}</section>
      <section class="section-grid">
        <div class="section-copy">
          <span class="eyebrow">${state.lang === "zh" ? "从设计稿到网站" : "From Stitch to site"}</span>
          <h2>${state.lang === "zh" ? "这个网站做了什么" : "What this website now does"}</h2>
          <p class="body-copy">
            ${
              state.lang === "zh"
                ? "原始 Stitch 页面提供了很强的视觉方向，但实际网站需要统一导航、真实交互、数据结构和表单逻辑。现在这些能力都被补齐。"
                : "The Stitch pages established the visual direction. The actual website still needed unified navigation, working interactions, data structure, and complete form logic. Those layers are now built in."
            }
          </p>
        </div>
        <div class="section-content">
          <div class="split-grid">
            <div class="card emphasis">
              <h3>${state.lang === "zh" ? "统一路由与导航" : "Unified routes and navigation"}</h3>
              <p class="body-copy">
                ${
                  state.lang === "zh"
                    ? "首页、关于、活动日历、体验项目、加入我们、FAQ、随笔以及预约页面全部整合在同一站点结构中。"
                    : "Home, About, Calendar, Experiences, Ways to Join, FAQ, Journal, and Booking now live inside one coherent site structure."
                }
              </p>
            </div>
            <div class="card">
              <h3>${state.lang === "zh" ? "真实可用的交互" : "Real, usable interactions"}</h3>
              <p class="body-copy">
                ${
                  state.lang === "zh"
                    ? "日历筛选、FAQ 搜索、Journal 分类、预约表单与 newsletter 订阅都能直接使用，并会在本地保存状态。"
                    : "Calendar filtering, FAQ search, journal categories, booking forms, and newsletter subscription all work directly and persist locally."
                }
              </p>
            </div>
          </div>
          <div class="quote-block">
            <q>${state.lang === "zh" ? "网站不该只是静态展示，而应当承接来访、理解与持续关系。" : "A site like this should not merely display atmosphere; it should support visits, understanding, and longer-term relationship."}</q>
            <div class="muted">${state.lang === "zh" ? "这也是“功能齐全”的核心。" : "That is the practical meaning of “complete functionality.”"}</div>
          </div>
        </div>
      </section>
      <section class="section-grid">
        <div class="section-copy">
          <span class="eyebrow">${state.lang === "zh" ? "设计分析" : "Design analysis"}</span>
          <h2>${state.lang === "zh" ? "从 Stitch 页面提炼出的核心语言" : "The visual language extracted from Stitch"}</h2>
        </div>
        <div class="section-content">
          ${SITE.philosophy
            .map(
              (item) => `
              <div class="panel">
                <h3>${state.lang === "zh" ? item.zh : item.en}</h3>
                <p class="body-copy">${state.lang === "zh" ? item.bodyZh : item.bodyEn}</p>
              </div>
            `,
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function renderAbout() {
  return `
    <div class="page">
      ${heroTemplate({
        eyebrow: state.lang === "zh" ? "关于学堂" : "About the academy",
        title:
          state.lang === "zh"
            ? "一个植根于东方智慧的现代生活实验室"
            : "A modern laboratory for grounded contemplative living",
        lede:
          state.lang === "zh"
            ? "Stitch 的 About 页强调这不是逃离生活，而是回到节律、秩序与感知。这里把那套叙事整理成可理解、可转化的结构。"
            : "The Stitch About page framed the academy not as escape but as a return to rhythm, order, and perception. This route restructures that narrative into a more usable and readable format.",
        note:
          state.lang === "zh"
            ? "关于页保留了原稿里的双语节奏、Mae Rim 的地理感与“通过日常实践重建内在秩序”的主题。"
            : "This page keeps the original bilingual pacing, the sense of Mae Rim, and the emphasis on rebuilding inner order through ordinary practice.",
        image: SITE.heroImages.about,
      })}
      <section class="split-grid">
        <div class="card emphasis">
          <span class="eyebrow">${state.lang === "zh" ? "为何存在" : "Why we exist"}</span>
          <h3>${state.lang === "zh" ? "为了给现代生活留出可持续的慢速节律" : "To create sustainable rhythm inside modern life"}</h3>
          <p class="body-copy">
            ${
              state.lang === "zh"
                ? "学堂不是用“治愈”来包装自己，而是通过重复、秩序、茶、阅读与共处，让人重新感到清晰。"
                : "The academy does not sell a vague feeling of healing. It offers repeated structures, tea, reading, shared meals, and attentive routines that slowly make life clearer."
            }
          </p>
        </div>
        <div class="card">
          <span class="eyebrow">${state.lang === "zh" ? "所在之地" : "A place in Mae Rim"}</span>
          <h3>${state.lang === "zh" ? "清迈北侧的山脚边" : "In the foothills north of Chiang Mai"}</h3>
          <p class="body-copy">
            ${
              state.lang === "zh"
                ? "从 Stitch 页面可见，地点感并不是背景板，而是品牌的一部分：树林、坡地、木构、通风与微光。"
                : "The screens treat location as part of the brand rather than as backdrop: forest edges, mountain air, timber, filtered light, and slower movement."
            }
          </p>
        </div>
      </section>
      <section class="panel">
        <span class="eyebrow">${state.lang === "zh" ? "三条主线" : "Three pillars"}</span>
        <div class="split-grid">
          ${SITE.philosophy
            .map(
              (item) => `
              <div>
                <h3>${state.lang === "zh" ? item.zh : item.en}</h3>
                <p class="body-copy">${state.lang === "zh" ? item.bodyZh : item.bodyEn}</p>
              </div>
            `,
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function filterEvents() {
  const filter = state.calendarFilter;
  return SITE.activities.filter((item) => filter === "all" || item.category === filter);
}

function renderCalendar() {
  const categories = [
    { id: "all", en: "All events", zh: "全部活动" },
    { id: "quiet", en: "Quiet sitting", zh: "静坐" },
    { id: "tea", en: "Tea", zh: "茶" },
    { id: "walking", en: "Walking", zh: "经行" },
    { id: "family", en: "Family", zh: "家庭" },
    { id: "reading", en: "Reading", zh: "阅读" },
    { id: "immersion", en: "Immersion", zh: "沉浸项目" },
  ];
  const items = filterEvents();
  return `
    <div class="page">
      ${heroTemplate({
        eyebrow: state.lang === "zh" ? "活动日历" : "Calendar",
        title: state.lang === "zh" ? "把学堂的节律排进真实日程" : "Schedule the academy into real life",
        lede:
          state.lang === "zh"
            ? "原始 Calendar 页已经有活动卡片和预约按钮，这里进一步补上筛选、快速预订与可导出的单次事件。"
            : "The original Calendar screen already suggested a schedule and booking CTA. This version adds filtering, fast booking, and exportable event details.",
        note:
          state.lang === "zh"
            ? "你可以按活动类型筛选，再点任一活动进入预约弹窗；该选择会自动带进表单。"
            : "Filter by activity type, then open booking directly from any event card. The selected event is carried into the reservation form.",
        image: SITE.heroImages.calendar,
        actions: `
          <button class="primary-button" data-book-program="first-visit">${t("bookVisit")}</button>
          <a class="ghost-button" href="#faq">${state.lang === "zh" ? "查看预约说明" : "View booking FAQ"}</a>
        `,
      })}
      <section class="filter-row">
        ${categories
          .map(
            (cat) => `
            <button class="filter-button ${state.calendarFilter === cat.id ? "active" : ""}" data-calendar-filter="${cat.id}">
              ${state.lang === "zh" ? cat.zh : cat.en}
            </button>
          `,
          )
          .join("")}
      </section>
      <section class="timeline">
        ${items
          .map(
            (event) => `
            <article class="timeline-item">
              <div class="timeline-time">${formatDate(event.date)}</div>
              <div>
                <h3>${state.lang === "zh" ? event.titleZh : event.titleEn}</h3>
                <div class="timeline-meta">
                  <span>${state.lang === "zh" ? event.timeZh : event.timeEn}</span>
                  <span>·</span>
                  <span>${state.lang === "zh" ? event.placeZh : event.placeEn}</span>
                </div>
                <p class="body-copy">${state.lang === "zh" ? event.bodyZh : event.bodyEn}</p>
              </div>
              <button class="chip" data-book-event="${event.id}">${t("bookVisit")}</button>
            </article>
          `,
          )
          .join("")}
      </section>
    </div>
  `;
}

function renderExperiences() {
  return `
    <div class="page">
      ${heroTemplate({
        eyebrow: state.lang === "zh" ? "深度体验" : "Experiences",
        title:
          state.lang === "zh"
            ? "把静心变成可进入、可停留、可继续的体验路径"
            : "Turn quiet attention into an accessible pathway of experiences",
        lede:
          state.lang === "zh"
            ? "Stitch 的 Experiences 页面里已经有活动、家庭项目、阅读会与预约节奏。这里把它整理成三层体验产品。"
            : "The Stitch Experiences screen already contained tea, family sessions, reading circles, and booking cues. Here they are organized into three clearer product layers.",
        note:
          state.lang === "zh"
            ? "每个体验都可以直接进入预约。后续如果要接真实 CRM，只需要把表单提交替换成 API。"
            : "Each experience can open booking directly. If you later connect a real CRM, you only need to replace the local form submission with an API call.",
        image: SITE.heroImages.experiences,
      })}
      <section class="event-grid">
        ${SITE.experiencePrograms
          .map(
            (program, index) => `
            <article class="event-card ${index === 0 ? "featured" : ""}">
              <div class="card-tag">${program.tag.toUpperCase()}</div>
              <h3>${state.lang === "zh" ? program.titleZh : program.titleEn}</h3>
              <p class="body-copy">${state.lang === "zh" ? program.metaZh : program.metaEn}</p>
              <p class="body-copy">${state.lang === "zh" ? program.bodyZh : program.bodyEn}</p>
              <button class="primary-button" data-book-program="${program.id}">${t("bookVisit")}</button>
            </article>
          `,
          )
          .join("")}
      </section>
      <section class="panel">
        <span class="eyebrow">${state.lang === "zh" ? "来自 Stitch 的页面分析" : "Analysis from the Stitch screen"}</span>
        <div class="split-grid">
          <div>
            <h3>${state.lang === "zh" ? "内容结构" : "Content structure"}</h3>
            <p class="body-copy">
              ${
                state.lang === "zh"
                  ? "Experiences 页实际上承担了两个任务：说明活动是什么，以及说明“适合谁”。本网站把这两层拆开，便于转化。"
                  : "The original Experiences screen was doing two jobs at once: explaining what the activities are, and helping visitors self-select. This site separates those roles so the page converts more clearly."
              }
            </p>
          </div>
          <div>
            <h3>${state.lang === "zh" ? "转化方式" : "Conversion strategy"}</h3>
            <p class="body-copy">
              ${
                state.lang === "zh"
                  ? "不再只有抽象的“Learn More”，而是为每条路径提供直接预约入口与表单上下文。"
                  : "Instead of abstract 'Learn More' links, each pathway now provides a direct booking route with form context already attached."
              }
            </p>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderJoin() {
  return `
    <div class="page">
      ${heroTemplate({
        eyebrow: state.lang === "zh" ? "加入我们" : "Ways to Join",
        title: state.lang === "zh" ? "从第一次来访，到长期连接" : "From first visit to deeper participation",
        lede:
          state.lang === "zh"
            ? "这一路由把 Stitch 的 Ways to Join 页面整理为更清晰的漏斗：初访、活动参与、项目、长期连接。"
            : "This route turns the Stitch Ways to Join page into a clearer funnel: first visit, activities, structured programs, and ongoing participation.",
        note:
          state.lang === "zh"
            ? "如果你还不确定从哪里开始，可以直接点任一入口，它会把选择同步进预约表单。"
            : "If you are unsure where to start, pick any path and the choice will be carried into the booking form.",
        image: SITE.heroImages.join,
      })}
      <section class="booking-grid">
        ${SITE.programs
          .map(
            (item) => `
            <article class="booking-item">
              <div class="card-tag">${state.lang === "zh" ? "路径" : "Pathway"}</div>
              <h3>${state.lang === "zh" ? item.titleZh : item.titleEn}</h3>
              <p class="body-copy">${state.lang === "zh" ? item.summaryZh : item.summaryEn}</p>
              <button class="primary-button" data-book-program="${item.id}">${t("learnMore")}</button>
            </article>
          `,
          )
          .join("")}
      </section>
      <section class="quote-block">
        <q>${state.lang === "zh" ? "一条路不是越长越好，而是要与你当下的节奏相匹配。" : "A meaningful path is not the longest one. It is the one that matches your present rhythm."}</q>
        <div class="chip-row">
          <button class="chip" data-book-program="first-visit">${state.lang === "zh" ? "先来一次" : "Start with one visit"}</button>
          <button class="chip" data-book-program="day-experience">${state.lang === "zh" ? "体验一天" : "Try a day experience"}</button>
          <button class="chip" data-book-program="retreat-program">${state.lang === "zh" ? "申请深度项目" : "Ask about retreat / residency"}</button>
        </div>
      </section>
    </div>
  `;
}

function renderFaq() {
  const items = SITE.faq.filter((item) => {
    const q = `${item.questionEn} ${item.questionZh} ${item.answerEn} ${item.answerZh}`.toLowerCase();
    return q.includes(state.faqQuery.toLowerCase());
  });
  return `
    <div class="page">
      ${heroTemplate({
        eyebrow: state.lang === "zh" ? "常见问题" : "Frequently asked questions",
        title: state.lang === "zh" ? "把疑问处理清楚，本身就是一种照顾" : "Clarity is part of care",
        lede:
          state.lang === "zh"
            ? "Stitch 的 FAQ 页有很好的内容，但缺少可快速检索的结构。这里加入搜索、分类与展开交互。"
            : "The Stitch FAQ screen already had strong content but lacked quick retrieval. This version adds search, categories, and an accordion interaction.",
        note:
          state.lang === "zh"
            ? "FAQ 覆盖理念、语言支持、家庭活动、预约时机与地理位置。"
            : "The FAQ covers philosophy, language support, family activities, booking timing, and physical location.",
        image: SITE.heroImages.faq,
      })}
      <section class="search-row">
        <input id="faq-search" type="search" placeholder="${state.lang === "zh" ? "搜索问题或关键词" : "Search questions or keywords"}" value="${escapeHtml(state.faqQuery)}" />
        <a class="ghost-button" href="#book">${state.lang === "zh" ? "直接咨询" : "Ask directly"}</a>
      </section>
      <section class="faq-grid">
        ${
          items.length
            ? items
                .map(
                  (item, index) => `
                <article class="faq-card ${index === 0 ? "open" : ""}">
                  <button class="faq-question" data-faq-toggle>
                    <div>
                      <div class="card-tag">${item.category.toUpperCase()}</div>
                      <h3>${state.lang === "zh" ? item.questionZh : item.questionEn}</h3>
                    </div>
                    <span class="faq-icon">+</span>
                  </button>
                  <div class="faq-answer">${state.lang === "zh" ? item.answerZh : item.answerEn}</div>
                </article>
              `,
                )
                .join("")
            : `<div class="empty-state">${state.lang === "zh" ? "没有找到匹配的问题。" : "No matching questions found."}</div>`
        }
      </section>
    </div>
  `;
}

function filterJournal() {
  return SITE.journal.filter((item) => state.journalFilter === "all" || item.category === state.journalFilter);
}

function renderJournal() {
  const categories = [
    { id: "all", en: "All essays", zh: "全部文章" },
    { id: "tea", en: "Tea", zh: "茶" },
    { id: "space", en: "Place", zh: "空间" },
    { id: "community", en: "Community", zh: "共处" },
    { id: "practice", en: "Practice", zh: "修习" },
  ];
  return `
    <div class="page">
      ${heroTemplate({
        eyebrow: state.lang === "zh" ? "随笔随记" : "Journal",
        title: state.lang === "zh" ? "关于茶、空间与慢节律的记录" : "Notes on tea, reading, and quiet practice",
        lede:
          state.lang === "zh"
            ? "这里保留了 Stitch Journal 页的编辑气质，同时加上分类筛选，让它更像一个真的内容频道。"
            : "This route preserves the editorial mood of the Stitch Journal screen while adding categorization so it works like a real content channel.",
        note:
          state.lang === "zh"
            ? "当前是高质量静态内容结构；未来如果要接 CMS，可直接把文章数据替换成 API。"
            : "This is currently a high-quality static editorial structure; if you later connect a CMS, the article array can be swapped for API data.",
        image: SITE.heroImages.journal,
      })}
      <section class="filter-row">
        ${categories
          .map(
            (cat) => `
            <button class="filter-button ${state.journalFilter === cat.id ? "active" : ""}" data-journal-filter="${cat.id}">
              ${state.lang === "zh" ? cat.zh : cat.en}
            </button>
          `,
          )
          .join("")}
      </section>
      <section class="journal-grid">
        ${filterJournal()
          .map(
            (entry, index) => `
            <article class="journal-card ${index === 0 ? "featured" : ""}">
              <div class="journal-cover" style="background-image:url('${entry.image}')"></div>
              <div class="card-tag">${entry.category.toUpperCase()}</div>
              <h3>${state.lang === "zh" ? entry.titleZh : entry.titleEn}</h3>
              <p class="journal-excerpt">${state.lang === "zh" ? entry.excerptZh : entry.excerptEn}</p>
              <div class="journal-meta">
                <span>${state.lang === "zh" ? "编辑笔记" : "Editorial note"}</span>
                <span>·</span>
                <span>${state.lang === "zh" ? "学堂内容频道" : "Academy channel"}</span>
              </div>
            </article>
          `,
          )
          .join("")}
      </section>
    </div>
  `;
}

function renderBook() {
  const latest = state.bookings[0];
  return `
    <div class="page">
      ${heroTemplate({
        eyebrow: state.lang === "zh" ? "预约咨询" : "Booking",
        title:
          state.lang === "zh"
            ? "把意向整理清楚，再进入预约"
            : "Turn interest into a clear booking path",
        lede:
          state.lang === "zh"
            ? "这个页面把所有 CTA 汇总到一个统一入口。无论从活动、体验还是 FAQ 过来，都可以继续完成预约。"
            : "This page gathers all booking CTAs into one unified destination. Whether visitors arrive from events, experiences, or FAQ, they can continue smoothly here.",
        note:
          state.lang === "zh"
            ? "点击下方任一项目或页面内按钮，都会打开预约表单；已提交的记录会保存在本机浏览器。"
            : "Choose any program below or use the page CTA to open the reservation form. Submitted entries are stored locally in the browser.",
        image: SITE.heroImages.book,
        actions: `<button class="primary-button" data-book-program="first-visit">${t("bookVisit")}</button>`,
      })}
      <section class="booking-grid">
        ${SITE.programs
          .map(
            (item) => `
            <article class="booking-item">
              <h3>${state.lang === "zh" ? item.titleZh : item.titleEn}</h3>
              <p class="body-copy">${state.lang === "zh" ? item.summaryZh : item.summaryEn}</p>
              <button class="chip" data-book-program="${item.id}">${t("bookVisit")}</button>
            </article>
          `,
          )
          .join("")}
      </section>
      <section class="panel">
        <h2>${state.lang === "zh" ? "最近一次预约记录" : "Latest booking on this browser"}</h2>
        ${
          latest
            ? `<p class="body-copy">${state.lang === "zh" ? "最近提交：" : "Latest submission:"} ${escapeHtml(latest.programLabel)} · ${escapeHtml(latest.date)} · ${escapeHtml(latest.name)}</p>`
            : `<p class="body-copy">${state.lang === "zh" ? "还没有预约记录。" : "No booking has been submitted on this browser yet."}</p>`
        }
      </section>
    </div>
  `;
}

function renderRoute() {
  const routes = {
    home: renderHome,
    about: renderAbout,
    calendar: renderCalendar,
    experiences: renderExperiences,
    join: renderJoin,
    faq: renderFaq,
    journal: renderJournal,
    book: renderBook,
  };
  const view = routes[state.route] || renderHome;
  app.innerHTML = view();
  updateStaticI18n();
  bindPageEvents();
}

function updateStaticI18n() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
}

function bindPageEvents() {
  document.querySelectorAll("[data-calendar-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarFilter = button.dataset.calendarFilter;
      renderRoute();
    });
  });

  document.querySelectorAll("[data-journal-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.journalFilter = button.dataset.journalFilter;
      renderRoute();
    });
  });

  const faqSearch = document.getElementById("faq-search");
  if (faqSearch) {
    faqSearch.addEventListener("input", (event) => {
      state.faqQuery = event.target.value;
      renderRoute();
    });
  }

  document.querySelectorAll("[data-faq-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".faq-card").classList.toggle("open");
    });
  });

  document.querySelectorAll("[data-book-program]").forEach((button) => {
    button.addEventListener("click", () => openBooking(button.dataset.bookProgram));
  });

  document.querySelectorAll("[data-book-event]").forEach((button) => {
    button.addEventListener("click", () => openBooking(button.dataset.bookEvent, true));
  });
}

function openBooking(id, isEvent = false) {
  const source = isEvent ? SITE.activities.find((item) => item.id === id) : SITE.programs.find((item) => item.id === id) || SITE.experiencePrograms.find((item) => item.id === id);
  if (!source) return;
  state.selectedProgram = {
    id,
    isEvent,
    labelEn: isEvent ? source.titleEn : source.titleEn,
    labelZh: isEvent ? source.titleZh : source.titleZh,
    summaryEn: isEvent ? `${source.timeEn} · ${source.placeEn}` : source.summaryEn || source.metaEn,
    summaryZh: isEvent ? `${source.timeZh} · ${source.placeZh}` : source.summaryZh || source.metaZh,
  };
  bookingTitle.textContent = state.lang === "zh" ? state.selectedProgram.labelZh : state.selectedProgram.labelEn;
  bookingDescription.textContent = state.lang === "zh" ? t("comingSoon") : t("comingSoon");
  bookingSummary.innerHTML = `
    <div>${state.lang === "zh" ? "项目" : "Selection"}: ${state.lang === "zh" ? state.selectedProgram.labelZh : state.selectedProgram.labelEn}</div>
    <div>${state.lang === "zh" ? "摘要" : "Summary"}: ${state.lang === "zh" ? state.selectedProgram.summaryZh : state.selectedProgram.summaryEn}</div>
  `;
  bookingStatus.textContent = "";
  bookingShell.reset?.();
  bookingModal.showModal();
}

function handleBookingSubmit(event) {
  event.preventDefault();
  const formData = new FormData(bookingShell);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const date = String(formData.get("date") || "").trim();
  if (!name || !email || !date || !state.selectedProgram) {
    bookingStatus.textContent = state.lang === "zh" ? "请完整填写表单。" : "Please complete the form.";
    return;
  }
  const record = {
    id: crypto.randomUUID(),
    programId: state.selectedProgram.id,
    programLabel: state.lang === "zh" ? state.selectedProgram.labelZh : state.selectedProgram.labelEn,
    name,
    email,
    date,
    guests: String(formData.get("guests") || "1"),
    notes: String(formData.get("notes") || ""),
    createdAt: new Date().toISOString(),
  };
  state.bookings.unshift(record);
  localStorage.setItem("jingxin-bookings", JSON.stringify(state.bookings));
  bookingStatus.textContent =
    state.lang === "zh" ? "预约已保存到当前浏览器。你可以继续完善或接入真实 API。" : "Booking saved in this browser. You can now connect this flow to a real API.";
  renderRoute();
}

function handleNewsletterSubmit(event) {
  event.preventDefault();
  const emailInput = document.getElementById("newsletter-email");
  const email = emailInput.value.trim();
  if (!email) return;
  state.newsletter.unshift({ email, createdAt: new Date().toISOString() });
  localStorage.setItem("jingxin-newsletter", JSON.stringify(state.newsletter));
  newsletterStatus.textContent =
    state.lang === "zh" ? "订阅已记录在当前浏览器。" : "Subscription captured in this browser.";
  newsletterForm.reset();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T08:00:00`);
  return new Intl.DateTimeFormat(state.lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

langToggle.addEventListener("click", () => {
  state.lang = state.lang === "en" ? "zh" : "en";
  localStorage.setItem("jingxin-lang", state.lang);
  renderNav();
  renderRoute();
});

menuToggle.addEventListener("click", () => {
  mobileNav.classList.toggle("open");
});

window.addEventListener("hashchange", () => {
  state.route = getRoute();
  renderNav();
  renderRoute();
});

bookingShell.addEventListener("submit", handleBookingSubmit);
newsletterForm.addEventListener("submit", handleNewsletterSubmit);

renderNav();
renderRoute();
