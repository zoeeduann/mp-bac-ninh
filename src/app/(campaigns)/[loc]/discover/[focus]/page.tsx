import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { campaignCopy, isCampaignFocus } from '@/lib/campaigns'
import { campaignExamples, campaignMedia, getCampaignContent } from '@/lib/campaign-content'
import { locationPath, locationUrl } from '@/lib/site-config'
import CampaignLeadForm from '@/components/campaigns/CampaignLeadForm'

type Props = { params: Promise<{ loc: string; focus: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { loc, focus } = await params
  if (loc !== 'bac-ninh' || !isCampaignFocus(focus)) return {}
  const copy = campaignCopy[focus]
  const url = locationUrl('zh-CN', loc, `/discover/${focus}`)
  return {
    title: `${copy.label}｜越南北宁善明小院`,
    description: copy.description,
    alternates: { canonical: url },
    robots: { index: false, follow: true },
    openGraph: {
      title: `${copy.label}｜北宁善明小院`,
      description: copy.description,
      url,
      locale: 'zh_CN',
      type: 'website',
      siteName: '北宁善明小院',
    },
  }
}

export default async function CampaignPage({ params }: Props) {
  const { loc, focus } = await params
  if (loc !== 'bac-ninh' || !isCampaignFocus(focus)) notFound()
  const copy = campaignCopy[focus]
  const { location, activities } = await getCampaignContent()
  const hero = campaignMedia(location.heroImage)
  const examples = campaignExamples(activities, focus)
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address || location.name)}`
  const otherFocus = focus === 'mindfulness' ? 'buddhism' : 'mindfulness'
  const faqs = [
    [
      '第一次接触，可以先了解吗？',
      '可以。你可以先留下联系方式，告诉小院你的兴趣和想了解的内容，再一起确认适合的活动或学习方向。',
    ],
    [
      '活动和课程收费吗？',
      '善明小院的所有活动与课程均为公益项目，免费参加。你可以先了解内容与安排，再决定是否参加。',
    ],
    [
      '活动和课程什么时候开始？',
      '不同活动和课程的时间及参加要求各不相同。页面中的案例帮助你了解小院，不代表当前仍在招生；具体安排以小院回复和当期活动说明为准。',
    ],
    [
      '留资料后，会发生什么？',
      '小院会通过你填写的 Zalo 与你联系，回复本次咨询。提交资料不代表报名成功，也不占用活动名额。',
    ],
    ['小院在哪里？', location.address || '越南北宁。具体到访位置与路线，可在咨询时向小院确认。'],
  ]
  return (
    <div className={`campaign campaign-${focus}`}>
      <a className="campaign-skip" href="#content">
        跳到主要内容
      </a>
      <header className="campaign-header">
        <a
          href={locationPath('zh-CN', loc)}
          className="campaign-brand"
          aria-label="北宁善明小院首页"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mindful-peace-yard-logo.svg" alt="静心小院" width="140" height="55" />
          <span>
            <strong>北宁善明</strong>
            <small>BAC NINH · VIETNAM</small>
          </span>
        </a>
        <nav aria-label="落地页导航">
          <a className="campaign-nav-about" href="#about">
            认识小院
          </a>
          <a className="campaign-nav-cta" href="#inquiry">
            {copy.cta} <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main id="content">
        <section className="campaign-hero">
          <div className="campaign-hero-copy">
            <p className="campaign-eyebrow">
              <span className="campaign-dot" />
              越南北宁 · 善明小院
            </p>
            <h1>
              {copy.title[0]}
              <br />
              <span>{copy.title[1]}</span>
            </h1>
            <p className="campaign-hero-description">{copy.description}</p>
            <a className="campaign-button" href="#inquiry">
              {copy.cta}
              <span aria-hidden="true">↗</span>
            </a>
            <p className="campaign-hero-note">公益免费 · 面向中文用户</p>
            <div className="campaign-hero-bottom">
              <span>{copy.eyebrow}</span>
              <a href="#explore">
                慢慢了解 <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
          <div className="campaign-hero-visual">
            {hero?.src && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.src}
                  srcSet={`${hero.small} 720w, ${hero.src} 1600w`}
                  sizes="(max-width: 760px) 100vw, 52vw"
                  alt={hero.alt || '北宁善明小院实景'}
                  fetchPriority="high"
                  width="1600"
                  height="1019"
                />
              </>
            )}
            <div className="campaign-photo-caption">
              <span>一处安静、开放的修学空间</span>
              <small>善明小院 · 实景</small>
            </div>
          </div>
        </section>
        <div className="campaign-ribbon">
          <span>禅意生活</span>
          <i aria-hidden="true">·</i>
          <span>智慧人生</span>
          <i aria-hidden="true">·</i>
          <span>觉醒之道</span>
        </div>
        <section id="explore" className="campaign-section">
          <div className="campaign-section-heading">
            <div>
              <p className="campaign-eyebrow">01 / {copy.label}</p>
              <h2>{copy.sectionTitle}</h2>
            </div>
            <p>{copy.intro}</p>
          </div>
          <div className="campaign-paths">
            {copy.paths.map(([title, description], index) => (
              <article key={title}>
                <span className="campaign-path-number">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <p className="campaign-section-footnote">
            所有活动与课程均为公益免费。具体开放项目、时间及参加方式请向小院咨询。
          </p>
        </section>
        <section id="about" className="campaign-about">
          <div className="campaign-about-inner">
            <div>
              <p className="campaign-eyebrow">02 / 认识善明小院</p>
              <h2>
                相聚在北宁，
                <br />
                一起学习，一起实践。
              </h2>
            </div>
            <div className="campaign-about-copy">
              <p>
                善明小院由一群志同道合的伙伴共同建设。在越南北宁，我们分享静心文化，营造一个开放、安静、彼此支持的学习空间。
              </p>
              <p>
                从禅意生活的体验，到人生智慧的学习，再到有次第的佛学修学，我们希望让正念、清明与慈悲走进日常。
              </p>
              <a href={locationPath('zh-CN', loc, '/about')}>
                阅读小院完整介绍 <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className="campaign-about-details">
            <span>线下空间 · 越南北宁</span>
            <span>学习与交流 · 日常实践</span>
            <a href="https://mindfulpeace.org" target="_blank" rel="noopener noreferrer">
              了解国际静心协会 MPI ↗
            </a>
          </div>
        </section>
        {examples.length > 0 && (
          <section className="campaign-section">
            <div className="campaign-section-heading">
              <div>
                <p className="campaign-eyebrow">03 / 从真实活动认识我们</p>
                <h2>
                  {focus === 'mindfulness'
                    ? '小院里，发生过这些相聚。'
                    : '我们从这些主题，一起读起。'}
                </h2>
              </div>
              <p>
                选取小院已发布的活动案例。
                <br />
                每一次相聚，都有具体的内容。
              </p>
            </div>
            <div className="campaign-examples">
              {examples.map(({ activity, state }) => {
                const photo = campaignMedia(activity.heroImage)
                return (
                  <article key={activity.id}>
                    {photo?.small && (
                      <a
                        className="campaign-example-image"
                        href={locationPath('zh-CN', loc, `/activities/${activity.slug}`)}
                        aria-label={`查看${activity.title}活动介绍`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.small}
                          alt={photo.alt || activity.title}
                          width="720"
                          height="480"
                          loading="lazy"
                        />
                      </a>
                    )}
                    <div className="campaign-example-copy">
                      <p className="campaign-example-status">{state}</p>
                      <h3>{activity.title.replace(/招生$/, '')}</h3>
                      <a href={locationPath('zh-CN', loc, `/activities/${activity.slug}`)}>
                        查看活动介绍 <span aria-hidden="true">↗</span>
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
            <p className="campaign-section-footnote">
              往期活动不接受历史场次报名。系列课可能已开课，能否参加或新一期安排请先咨询。
            </p>
          </section>
        )}
        <section id="inquiry" className="campaign-inquiry">
          <div className="campaign-inquiry-copy">
            <p className="campaign-eyebrow">保持联系 / LET’S CONNECT</p>
            <h2>
              {copy.formTitle.split('\n').map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </h2>
            <p>{copy.formDescription}</p>
            <ol>
              <li>
                <span>1</span>留下姓名和 Zalo
              </li>
              <li>
                <span>2</span>小院与你联系，介绍相关安排
              </li>
              <li>
                <span>3</span>充分了解后，再决定是否参加
              </li>
            </ol>
          </div>
          <div className="campaign-form-card">
            <p className="campaign-eyebrow">北宁善明小院 · 咨询登记</p>
            <h3>让我们认识你</h3>
            <CampaignLeadForm focus={focus} locationId={location.id} />
          </div>
        </section>
        <section className="campaign-section campaign-faq">
          <div>
            <p className="campaign-eyebrow">来之前，你可能想知道</p>
            <h2>把问题，慢慢聊清楚。</h2>
          </div>
          <div>
            {faqs.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="campaign-address">
          <div>
            <p className="campaign-eyebrow">找到这处小院</p>
            <h2>越南北宁 · 善明小院</h2>
            <p>{location.address}</p>
          </div>
          <a
            className="campaign-button campaign-button-outline"
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
          >
            在 Google 地图中查看 <span aria-hidden="true">↗</span>
          </a>
        </section>
        <section id="privacy" className="campaign-privacy">
          <h2>资料使用说明</h2>
          <p>
            你提交的姓名和 Zalo
            注册手机号将保存至善明小院的咨询管理系统，供负责咨询的工作人员联系你、回复本次活动或课程咨询。页面来源及广告素材标识（如有）会随咨询一并记录，便于了解咨询来自哪个入口。提交不会自动报名、付款或加入群聊。若不希望继续联系，或希望更正、删除资料，可在小院通过
            Zalo 联系你时提出，也可通过官网公布的联系渠道提出。
          </p>
          <p>
            为分析页面效果，系统按日期、页面类型和广告来源汇总访问次数、开始填写次数和成功咨询数。漏斗统计表不保存姓名、Zalo、IP、Cookie
            或可识别个人的事件记录，也不向 Google
            发送这些统计。统计按次数汇总，刷新页面可能增加访问次数，因此不代表精确的独立人数。
          </p>
          <p>
            不想留下资料，也可以继续浏览。
            <a href={locationPath('zh-CN', loc, `/discover/${otherFocus}`)}>
              了解{campaignCopy[otherFocus].label} ↗
            </a>
          </p>
        </section>
      </main>
      <footer className="campaign-footer">
        <span>善明小院 · 北宁</span>
        <p>禅意生活 · 智慧人生 · 觉醒之道</p>
        <a href={locationPath('zh-CN', loc)}>返回小院官网 ↗</a>
      </footer>
      <div className="campaign-mobile-action">
        <span>善明小院 · 北宁</span>
        <a href="#inquiry">{copy.cta} ↗</a>
      </div>
    </div>
  )
}
