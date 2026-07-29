# 静心学堂 · 泰国 网络站 · 设计文档

- **项目**:静心学堂 · 泰国 / Mindfulpeace Academy Thailand — 三学堂网络官网
- **日期**:2026-05-11(更新:2026-05-12 多学堂架构转型)
- **状态**:设计阶段(等待实施计划)
- **关联站点**:国际站 https://mindfulpeace.org/
- **生产域名**:mindfulpeaceth.com(用户已购买,2026-05-12)

---

## 1. 目标与定位

### 1.1 网络概述

本站是 **静心学堂 · 泰国 / Mindfulpeace Academy Thailand** 的网络官网,旗下三家学堂:

| Slug | 中文名 | 英文名 | 城市 |
|---|---|---|---|
| `bangkok` | 曼谷如如学堂 | Bangkok Ruru Academy | 曼谷 / Bangkok |
| `chiangmai` | 清迈心灯学堂 | Chiang Mai Xindeng Academy | 清迈 / Chiang Mai |
| `phuket` | 普吉学堂(名字待定) | Phuket Academy (name TBD) | 普吉 / Phuket |

每家学堂均为**国际静心协会 mindfulpeace.org** 的本地分支节点。

### 1.2 两个核心目标

1. **引流传灯**:让人能通过 Google 搜索、Google Maps、FB、小红书等渠道找到对应学堂,留下"安静、温暖、值得来"的第一印象,并方便分享。
2. **本地运营**:各学堂发布活动日历、收集预约信息、记录现场。学堂内部以此作为预约留底。

### 1.3 定位与边界

- 各学堂均为**国际静心协会 mindfulpeace.org** 的本地分支。
- **教义、修学资源、师承介绍、录播课程** 等"深内容"全部归国际站,本网络站**不重复**,仅在各学堂「关于」页和页脚链接过去。
- 本网络站对**每家学堂**只做三件事:**本地名片、本地活动、本地社区**。

---

## 2. 范围与非目标

### 2.1 v1 范围(本次实施)

- **网络总门户首页 `/`**:平等展示 3 家学堂的入口卡片
- **每家学堂子站(8 个路由模板 × 3 学堂)**:从同一套组件共享服务,路由树以 `/{locationSlug}` 为前缀
- 全站中英双语(zh-CN 默认 + en)
- 活动管理 + 场次管理 + 类别管理(按学堂隔离数据)
- 预约系统(含容量、候补、反垃圾),预约关联到具体学堂
- 现场日志(图文,按学堂)
- 简单 CMS 后台(供 admin + staff 使用)
- **顶部学堂切换器**:在所有 `/{loc}/*` 页面可见,可切换到其他学堂的同一路径
- **每家学堂独立的**:联系方式 / 关于 / 地图 / FAQ
- Gmail SMTP 自动通知(收到预约 / 状态变更)
- 翻译协助按钮(LLM 辅助,不自动发布)

### 2.2 明确不做(v1)

- 在线支付(所有活动免费)
- 用户自助注册 / 登录 / 自助改约
- 真正的"在线课程"功能(交给国际站)
- 暗色模式
- 首屏视频
- 移动 App
- 中国大陆 ICP 备案(目标用户不需要裸连国内)
- 自动翻译并发布(翻译只做"协助",由人审定)
- **按学堂分权**:v1 所有 admin/staff 都能管理所有学堂,不按学堂隔离权限(推迟到 v1.1)
- **跨学堂聚合视图**(如"泰国全网近期活动"):v1.1 再做

### 2.3 v1.1+ 候选

- 用户自助取消预约(需邮件二次验证)
- 出席签到 / 课后反馈表
- 多语言扩展(泰语)
- 邮件 newsletter 订阅
- 学员故事 / 心得投稿
- **按学堂分权**:staff 只能管理其所属学堂的内容
- **跨学堂聚合视图**:全泰国活动汇总、全泰国日志汇总
- **各学堂独立的微信公众号集成**

---

## 3. 受众与典型场景

### 3.1 主要受众

- **中文使用者**:计划来或已在泰国(曼谷/清迈/普吉)的中文社群,部分通过国际站知道各学堂
- **英文使用者**:本地外籍居民、来泰国的国际访客

两者并重,首屏内容、活动详情、预约表单都全部双语。

### 3.2 四个典型旅程

**A. Google / Google Maps 搜索 → 对应学堂首页 → 预约**
> 用户在 Google 搜"bangkok meditation"或"清迈正念"等词,看到 Google Maps 卡片,点进网站。直接落地在对应学堂的子站首页(如 `/bangkok` 或 `/chiangmai`),而不是网络总门户。该页要在 5 秒内回答:这是什么?在哪?最近有什么活动?怎么预约?

**B. 小红书 / FB 看到分享 → 活动详情 → 预约**
> 用户从社交平台直接跳到某场具体活动详情(如 `/chiangmai/activities/sunday-meditation`)。这一页本身必须能说服人,有时间地点、有照片、有简介、有"立即报名"按钮。活动详情页已绑定学堂,报名自动关联对应学堂。

**C. 老学员二次访问 → /{loc}/book → 看近期场次 → 报名**
> 已经来过的人不需要看介绍,直接访问对应学堂的 `/book` 页(如 `/chiangmai/book`),看近期有什么、直接报。

**D. 新访客直达根域名 → 总门户 → 选择学堂 → 进入子站**
> 新用户通过口碑、搜索或广告来到 `mindfulpeaceth.com` 根域名。总门户平等展示 3 家学堂的大卡片(城市、名字、一句气质描述),用户选择离自己最近或最感兴趣的学堂,进入该学堂子站。

---

## 4. 技术栈

### 4.1 选型(已确认)

| 用途 | 技术 | 理由 |
|---|---|---|
| 全栈框架 | **Payload CMS v3**(基于 Next.js 15) | 前后台同代码库;后台 UI 从 schema 自动生成;原生 i18n |
| 数据库 | **Neon Postgres**(海外免费版) | 自动备份、按用量计费、与 Vercel 集成好 |
| 文件存储 | **Cloudflare R2** | 免费额度大(10 GB);零出口费用 |
| 应用托管 | **Vercel** Hobby | 与 Next.js 原生集成;预览部署;CDN |
| 反垃圾 | **Cloudflare Turnstile** | 无视觉干扰;免费 |
| 邮件 | **Gmail SMTP** + 应用专用密码 | 不引入第三方;免费;发件人地址自然 |
| 翻译协助 | **Anthropic Claude Haiku API** | 后台按钮调用;成本可忽略 |
| 错误监控 | **Sentry** Free | 5k 错误/月免费 |
| 样式 | Tailwind CSS + 自定义令牌 | 与 Payload 默认模板兼容 |
| 域名 | `mindfulpeaceth.com`(用户已购,2026-05-12) | 生产域名已确定 |

### 4.2 选型时拒掉的方案

- **Next.js + 自写后台 / Supabase**:后台需手写,加新内容类型成本高,长期维护负担大
- **Astro + 外部 CMS(Sanity / Strapi)**:三件套(前台 + CMS + 预约后端),复杂度溢出
- **WordPress + 事件插件**:双语和现代视觉受限于插件
- **国内云 + ICP 备案**:用户已否决(目标受众不需要)

---

## 5. 信息架构

### 5.1 公开路由(两级结构)

**网络级路由(1 个):**

| 路由 | 中文名 | 内容要点 |
|---|---|---|
| `/` | 总门户首页 | 品牌标识、3 张学堂大卡**平等并排**(城市 / 学堂名 / 一句气质 / Hero 图 / 进入按钮)、关于网络的一段简介、链回 mindfulpeace.org |

**每家学堂路由(`{loc}` ∈ `bangkok` \| `chiangmai` \| `phuket`):**

| 路由 | 中文名 | 内容要点 |
|---|---|---|
| `/{loc}` | 学堂首页 | Hero(主视觉 + 两个 CTA「我要预约 / 了解学堂」)、3 张近期活动卡、学堂气质段落、Journal 最新 3 图、底部 CTA |
| `/{loc}/activities` | 活动 | 上半月历视图,下半按类别筛选的活动卡(仅此学堂) |
| `/{loc}/activities/[slug]` | 活动详情 | 大图、双语正文、场次列表、容量信息、注意事项、报名按钮 |
| `/{loc}/book` | 我要预约 | 上半近期可报活动列表(此学堂),下半"自由咨询"通用表单 |
| `/{loc}/journal` | 现场 | 图墙(网格),按时间倒序(仅此学堂) |
| `/{loc}/journal/[slug]` | 日志详情 | 照片组 + 简短回顾 + 关联活动链接 |
| `/{loc}/about` | 关于 | 学堂故事、团队介绍、Google Maps 嵌入、交通方式、链回 mindfulpeace.org |
| `/{loc}/contact` | 联系 | FAQ 折叠、微信二维码、邮箱、电话、社交外链 |

**总计**:1 个总门户 + 8 个路由模板 × 3 学堂 = **~25 个公开可索引 URL**(~7 个页面模板,组件共享)。

### 5.2 后台路由

| 路由 | 用途 |
|---|---|
| `/admin` | Payload 后台(登录后访问) |

### 5.3 导航

**顶部栏 — 总门户 `/`:**
- 左:品牌标识(网络级)
- 中:网络 · The Network / 寻找学堂 / About / Contact
- 右:`EN / 中文` 切换(无 Book CTA,门户层不直接预约)

**顶部栏 — 学堂子站 `/{loc}/*`:**
- 左:品牌标识 + **学堂切换器 chip**(显示当前学堂名,下拉可切到其他学堂的同一路径)
- 中:首页 / 活动 / 现场 / 关于 / 联系(全部 scoped 到当前学堂)
- 右:`EN / 中文` 切换 + **「我要预约 / Book」CTA 按钮**(视觉加重,链到 `/{loc}/book`)

**移动端**:
- 顶栏只显示 Logo + 学堂 chip(子站) + 汉堡按钮 + Book CTA
- 汉堡展开为全屏菜单

**页脚(全站通用)**:
- 学堂/网络简介一句话
- 导航链接组
- **"网络 · The Network" 列**:列出 3 家学堂及城市,当前学堂标 ✓
- 联系方式(当前学堂的地址、邮箱、电话;门户页显示网络联系)
- 外链:mindfulpeace.org、社交媒体
- 版权与年份

---

## 6. 数据模型

### 6.1 Payload 集合(可重复内容)

#### `locations` · 学堂(每家学堂一行)

| 字段 | 类型 | 说明 |
|---|---|---|
| `slug` | text, unique, required | `bangkok` / `chiangmai` / `phuket`(URL 用) |
| `name` | text, localized, required | 学堂名(双语) |
| `city` | text, localized, required | 城市名(双语) |
| `tagline` | text, localized | 一句话气质描述(双语) |
| `heroImage` | upload → media, required | 学堂主视觉 |
| `story` | richText, localized | 学堂故事(About 内容,双语) |
| `address` | textarea, localized | 详细地址 |
| `mapEmbedUrl` | text | Google Maps 嵌入 URL |
| `transport` | richText, localized | 交通方式 |
| `team` | array of {name, photo, bio(localized)} | 团队成员 |
| `email` | email | 学堂联系邮箱 |
| `phone` | text | 学堂电话 |
| `wechatQr` | upload → media | 微信二维码 |
| `social` | array of {label, url} | 社交链接 |
| `faq` | array of {q, a}(都 localized) | FAQ |
| `order` | number | 总门户首页排序权重(平等时按字母,可微调) |

权限:read 公开;create/update/delete = admin only(创建/修改学堂是结构性变更,只有 admin 能做)。

注意:`team` / `faq` / `address` / `transport` 从旧的 About + Contact globals 迁移过来,**改为每家学堂一份**。

#### `activities` · 活动

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | text, localized | 双语标题 |
| `slug` | text, unique | URL slug(由 title 生成,可编辑) |
| `category` | relation → `categories` | 类别(自由文本,通过 Categories 集合) |
| `location` | relation → `locations`, **required** | 所属学堂(已建索引,用于路由和数据过滤) |
| `heroImage` | upload → `media` | 主图,必填 |
| `gallery` | array of upload | 附加图,选填 |
| `shortDesc` | text, localized | 卡片摘要(≤ 120 字) |
| `description` | richText, localized | 详情正文 |
| `venueNote` | text, localized | 场地备注(默认"学堂",可改为具体场地) |
| `capacity` | number, required, min=1 | 名额上限(本活动默认上限) |
| `notes` | richText, localized | 注意事项 |
| `occurrences` | array | 场次列表(见下) |
| `status` | select | `draft` / `published` / `archived` |
| `seoTitle`, `seoDescription` | localized | SEO meta override(可选) |

**场次子表 `occurrences`**(嵌套数组):

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text, auto, **永久** | Payload 自动生成,**一旦创建不可变**;预约用它做外键引用 |
| `startAt` | datetime, required | 开始时间,**存 UTC**,前台按 `Asia/Bangkok` 渲染并标注 `ICT (+07:00)` |
| `endAt` | datetime, required | 结束时间(同 startAt 的存储/展示约定) |
| `capacityOverride` | number, optional | 本场次单独的上限 |
| `status` | select | `open` / `full` / `cancelled` / `deleted` |
| `internalNotes` | text | 内部备注(不公开) |

**场次时区约定**(关键):
- **存储**:全部 UTC
- **展示**:默认按学堂时区 `Asia/Bangkok`,所有时间标签后附 `ICT` 或 `+07:00`,避免中国大陆 UTC+8 用户误解
- **后台编辑**:输入时使用学堂时区,系统自动转 UTC 存

**场次删除策略**(防孤儿预约):
- Staff 在后台"删除"一个 occurrence,**实际是软删除**:`status` 改为 `deleted`,记录不真正从数组里移除
- 前台 `/{loc}/activities` 列表与详情页跳过 `status=deleted` 的场次
- 已关联到该 occurrence 的预约保留,后台预约表格里该场次显示"已取消"标记
- 真正硬删只能由 admin 在数据库层做(非常规操作)

**新增场次的三种快捷方式**(后台 UI 提供):
- **单次**:填一对 start/end
- **周期生成**:选周几(多选)+ 时间 + 起止日期 → 批量生成
- **多日整块**:选起止日期 → 生成一个跨多日的 occurrence

#### `categories` · 类别

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | text, localized, required | 类别名(中英) |
| `slug` | text, unique | URL slug(用于筛选 URL) |
| `order` | number | 排序权重 |

类别完全自由文本,用户可在创建活动时下拉选已有或现场新建。前台 `/{loc}/activities` 筛选条会反映当前学堂所有 `published` 状态有活动的类别。

**删除保护**:被任何活动引用的类别**不可删除**——Payload 提供 `beforeDelete` hook,删除时检查 `activities.category` 引用,若有则拒绝,提示"先把使用该类别的活动改成别的类别"。这一行为对 admin 和 staff 都生效。

**同等保护应用到活动**:被任何预约(status ∈ pending/confirmed/waitlist)引用的活动**不可删除**——只能 `status=archived`(归档,前台不显示,但不影响历史数据)。Payload `beforeDelete` hook 检查活动引用的预约,若有则拒绝并提示"该活动有预约记录,请改为归档"。

#### `journal` · 现场日志

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | text, localized | 标题 |
| `slug` | text, unique | URL slug |
| `location` | relation → `locations`, **required** | 所属学堂(已建索引) |
| `date` | date, required | 活动发生日期(可不等于发布日期) |
| `relatedActivity` | relation → `activities`, optional | 关联活动(可选) |
| `coverImage` | upload | 封面图 |
| `photos` | array | 照片组(每张可加 caption) |
| `body` | richText, localized | 简短回顾 |
| `status` | select | `draft` / `published` |

#### `reservations` · 预约(仅后台)

| 字段 | 类型 | 说明 |
|---|---|---|
| `createdAt` | datetime, auto | 提交时间 |
| `source` | select, auto | 入口埋点:`home_cta` / `nav_book` / `book_list` / `book_general_inquiry` / `activity_detail` / `shared_link` |
| `location` | relation → `locations`, **required** | 所属学堂。活动预约时从 `activity.location` 自动派生并写入(查询方便);自由咨询时由用户在 `/{loc}/book` 的单选按钮选择,默认为当前 URL 学堂 |
| `activity` | relation → `activities`, optional | 所选活动(自由咨询则空) |
| `occurrenceId` | text, optional | 所选场次的稳定 ID(自由咨询则空) |
| `name` | text, required | 联系人姓名 |
| `email` | email, required-if-no-wechat | 邮箱 |
| `wechatId` | text, required-if-no-email | 微信 ID |
| `phone` | text, required | 电话 |
| `guests` | number, default 1, min 1, max 10 | 人数 |
| `direction` | select, only for general inquiry | 禅修 / 正念 / 一对一 / 参观 / 其他 |
| `notes` | textarea, optional | 备注 |
| `language` | select | `zh` / `en`,从前端语言自动捕获 |
| `status` | select | `pending` / `confirmed` / `cancelled` / `waitlist` / `deleted` |
| `confirmedAt` | datetime, auto-on-change | 状态变更时间 |
| `confirmedBy` | relation → `users`, auto | 谁操作的 |
| `deletedAt` | datetime, auto | 软删除时间(仅 deleted 状态时有值) |
| `deletedBy` | relation → `users`, auto | 谁删的 |
| `internalNotes` | textarea | 后台内部备注 |

**校验规则**:
- `email` 或 `wechatId` 至少一个非空
- `phone` 必填
- 自由咨询时(`activity` 为空)**不做容量校验**,直接写入 `pending`
- 关联活动时,提交瞬间事务性检查容量(见 §7.2 并发模型)

**删除策略**:预约**只软删**——`status` 改为 `deleted`,记录 `deletedAt` 和 `deletedBy`。Staff 在后台点"删除"按钮实际是软删。容量计算时 `deleted` 不计入占用。这一约束既保护合规审计,又便于回溯误删。硬删需 admin 在数据库层操作。

#### `users` · 后台账号

Payload 自带,扩展字段:
- `role`:`admin` / `staff`
- 仅 admin 可以创建/删除其他 users
- 不开放公开注册

#### `media` · 上传文件

Payload 自带 uploads 集合,接入 R2 适配器。生成多尺寸缩略图(thumbnail / card / hero / og)。

**上传约束**(安全边界):
- **允许 MIME**:`image/jpeg`、`image/png`、`image/webp`、`image/avif` 仅图片
- **单文件大小**:≤ 8 MB
- **服务端图像处理**:Payload sharp pipeline 强制开启,生成上述多尺寸 + 自动旋转 + 剥离 EXIF(避免泄露拍摄地点 GPS)
- **拒绝**:任何可执行文件、PDF、视频、压缩包(v1 不需要,后期再开)
- **文件命名**:服务端重命名为 `<timestamp>-<random>.<ext>`,避免冲突和路径注入

### 6.2 双语字段回退策略

所有 `localized` 字段(title、shortDesc、description、notes、name、location 等)统一采用以下规则:

- **存储**:zh-CN 和 en 各存一份,允许任一为空
- **前台读取**:若访客语言版本为空,**回退到默认语言 `zh-CN`**;前台不显示空白或乱码
- **后台校验**:`title` 和 `shortDesc` **强制要求两种语言都填**(发布时校验,草稿无此限制)
- **其他 localized 字段**(description、notes 等):后台发布时若仅填一种语言,弹一个**非阻塞警告**"另一种语言未填,将回退到中文显示",由 staff 决定是否继续
- **SEO `hreflang`**:仅当某语言版本"完整"(必填字段都有该语言内容)才标注 alternate;否则只输出默认语言的 canonical

### 6.3 Payload 全局(单例)

| 全局 | 字段 | 说明 |
|---|---|---|
| `portalHome` | 网络 Hero 图、双语网络标题、副标题、两个 CTA 文字 + 链接(寻找学堂 / 关于网络)、"关于本网络"双语段落 | 总门户 `/` 专用;**不含**特色活动列表(活动列表是学堂级) |
| `settings` | 站名、OG 默认图、页脚版权文字、Gmail SMTP 收件人地址(管理员通知用)、`mindfulpeace.org` 链接、`defaultLocation`(relation → locations, optional — URL 异常时的兜底学堂) | 全局配置 |

> **已删除** `about` 和 `contact` 全局。各学堂的故事 / 团队 / 地址 / 地图 / 交通 / 微信 / FAQ 全部迁入 `locations` 集合的对应行(每家学堂各一份)。

### 6.4 角色权限矩阵

| 操作 | admin | staff |
|---|---|---|
| Locations CRUD | ✅ | ❌(创建/修改学堂是结构性变更,只有 admin 能做) |
| 活动 CRUD(任意学堂) | ✅ | ✅(v1 全开,含删除) |
| 类别 CRUD | ✅ | ✅ |
| 日志 CRUD(任意学堂) | ✅ | ✅(v1 全开,含删除) |
| 预约 查看/改状态/加备注(任意学堂) | ✅ | ✅(v1 全开) |
| 预约 删除 | ✅ | ✅ |
| 全局(portalHome) | ✅ | ❌ |
| 全局(Settings) | ✅ | ❌ |
| Users CRUD | ✅ | ❌ |

> **v1 注**:staff 在 v1 可管理**所有学堂**的内容,不作学堂隔离。按学堂分权将在 v1.1 引入(见 §2.3)。

---

## 7. 关键流程

### 7.1 预约流程

所有预约都关联到某一家学堂。从活动详情页发起的预约,location 自动跟随活动;从 `/{loc}/book` 自由咨询发起的预约,用户用单选按钮选目标学堂(默认 = 当前 URL 里的学堂)。

```
入口(学堂首页 hero / 顶栏 Book / 活动详情 / /{loc}/book / 分享链接)
   ↓
打开预约表单(modal 或独立页)
   ↓
若从活动详情/分享链接来:顶部预填「正在报名:活动名 · 场次时间(ICT)」
若从 /{loc}/book 自由咨询来:表单含 direction 下拉 + 学堂单选(默认当前 loc),不带 activity/occurrenceId
   ↓
填写:姓名 / 邮箱 or 微信 / 电话 / 人数 / 备注
   ↓
前端校验(邮箱 or 微信至少一项;Turnstile 通过;蜜罐为空)
   ↓
POST /api/reservations → 后端流程:
   1. 校验 Turnstile token、蜜罐、必填字段
   2. **若 activity 为空**(自由咨询)→ 直接写入 status=pending,跳到第 5 步
   3. **若有 activity** → 事务性校验容量(见 §7.2 并发模型):
        ├─ 容量够 → 写入 status=pending
        ├─ 已满 → 返回 `409 capacity_full`,前端弹窗"已满,要进候补吗?"
        │         用户确认 → 重发请求带 `acceptWaitlist=true` → 写入 status=waitlist
        └─ 数据冲突 → 返回 `409 retry`,前端自动重试一次
   4. (与预约写入解耦)排入邮件任务队列:
        - 若有邮箱:发"已收到,待确认"回执
        - 发新预约提醒给 settings.adminEmail
   5. 返回 200,前端显示成功页 + 微信/邮件等待提示
   ↓
管理员在后台看到 → 通过微信或邮件人工联系 → 后台改状态为 confirmed
   └─ 状态变更触发新一封邮件入队(若有邮箱)
```

**邮件失败语义**(关键):邮件发送与预约写入**完全解耦**——
- 预约写入 DB 成功后即返回 200,**不等**邮件发出
- 邮件失败(Gmail SMTP 超时、应用密码失效)**不回滚**预约
- 失败入 Sentry + 后台预约记录上有 `emailStatus` 字段标记(`sent` / `failed`),staff 可在后台看到哪些邮件没发出去,手动微信补
- 重试策略:同一封邮件最多自动重试 3 次(指数退避),仍失败标 `failed`

### 7.2 容量与并发模型

**容量计算**:对某 occurrence,占用 = `SUM(guests) WHERE status IN ('pending', 'confirmed', 'waitlist')` —— 注意 `waitlist` **不**计入容量(候补不占名额,只排队),`cancelled` 和 `deleted` 也不计入。

校正:
- 计入容量的状态:`pending`, `confirmed`
- 不计入:`waitlist`, `cancelled`, `deleted`
- 容量上限:`occurrence.capacityOverride` 优先,否则 `activity.capacity`

**并发模型**(防止"两个用户同时抢到最后一个名额"):
- 使用 Postgres **行级锁**:`SELECT ... FOR UPDATE` 锁定 occurrence 所在 activity 文档
- 在事务内:1) 锁活动 → 2) 计算当前占用 → 3) 判断 + guests ≤ capacity → 4) 插入预约 → 5) 提交事务
- 由 Payload `beforeChange` hook 在 reservations 创建时执行
- 锁超时:5 秒,超时返回 `409 retry` 让前端重试一次

**重复提交 vs 限流**:
- **允许**同一邮箱/微信对同一场次多次预约(帮朋友)
- 限流改为 **同 IP 5 分钟最多 10 次提交**(放宽,避免帮朋友的合法场景被卡)
- Turnstile + 蜜罐继续在所有提交上生效
- **推荐做法**(前端 UX 提示):表单底部一行小字"一次预约即可填多人,若要分别留每个朋友的联系方式才需要多次提交",引导优先用 `guests > 1`

**候补流程**:
- 候补不占容量,允许无限排队(在数据库层,只显示前 20 条在后台)
- 当确认状态的预约被改为 `cancelled` / `deleted` 释放出位置,后台仪表盘弹"⚠️ 第 N 场有候补可上",staff 手动决定是否提级(把某条候补改成 `pending` → 再走人工确认 → `confirmed`)
- 前台 `/{loc}/activities/[slug]` 在场次已满时显示"本场已满,可进候补",**不**显示当前候补人数(避免劝退)

### 7.3 后台日常工作流

**仪表盘**(登录后第一屏):
- 卡片 1:🆕 待确认预约(数字 + 最近 5 条)
- 卡片 2:📅 未来 7 天场次(占用比例)
- 卡片 3:📷 最近一场活动(去写日志的快捷入口)
- 卡片 4:📊 本月概览(预约数、出席率、新增日志数)

**5 个最常用动作**:
1. 新建活动(含场次三种快捷生成)
2. 看 / 改预约状态(表格视图 + 筛选 + CSV 导出)
3. 发现场日志
4. 改全局(Home/About/Contact)
5. 加义工账号

**贴心功能**:
- 草稿自动保存
- 中英翻译协助按钮(调 Claude Haiku,不自动发布)
- 后台移动端友好
- 新预约红点提醒 + Gmail 邮件提醒
- 每个场次可生成独立报名链接:`/[locationSlug]/activities/[slug]?occ=<occurrenceId>&src=shared` —— 打开后自动滚到预约区,预填好对应场次。链接不签名(免费活动,无防爆破压力);源参数 `src=shared` 用于埋点 source。

---

## 8. 视觉方向

### 8.1 总基调

**方向 B「暖木青苔」净化版**——保留温暖的木色调与禅意,**移除手绘装饰**,改用纯留白做节奏。和母站 mindfulpeace.org 保持血缘,但更在地、更温暖。

### 8.2 颜色令牌

| 用途 | 色值 | 说明 |
|---|---|---|
| 主背景 | `#F1ECE0` | 温米 |
| 深背景(footer/section) | `#3C2E22` | 木茶 |
| 主文字 | `#2A211A` | 深可可 |
| 主辅色 | `#5C6A48` | 青苔绿(链接、按钮 hover) |
| 强调色 | `#A87544` | 柚木金(主 CTA) |
| 中性辅 | `#7A6F62` | 副文字 |

### 8.3 字体

- 中文:**Noto Serif SC**(宋体衬线,400/500/700)
- 英文:**Manrope**(无衬线现代,400/500/700)
- 数字与 UI 元素:Manrope
- 中英对比制造呼吸,衬线 + 无衬线的混搭比单一更显现代

### 8.4 节奏原则

- 大量留白,每屏只讲一件事
- 照片是主角,文字辅助
- 不用动画做装饰;状态切换 ≤ 200ms 淡入
- 不放首屏视频
- 移动优先
- v1 不做暗色模式

### 8.5 图片策略

- v1 用 Unsplash 高质量免费图(清迈寺庙、茶具、竹林、晨雾)做占位
- 每张占位图后台打 `placeholder` 标记
- 用户拍到学堂真实照片后逐张替换

---

## 9. 部署与基础设施

### 9.1 环境

| 环境 | 域名 | 用途 |
|---|---|---|
| 开发 | localhost:3000 | 本地开发 |
| 预览 | Vercel 自动生成 `<branch>.vercel.app` | 每个 PR 一个预览链接 |
| 生产 | **mindfulpeaceth.com**(用户已购买,2026-05-12) | 正式对外 |

### 9.2 仓库

- GitHub 仓库放在**用户个人账号**下
- 主分支 `main` 受保护,只能通过 PR 合入
- Vercel 接 GitHub 自动部署

### 9.3 内容与部署分离

- 用户在 `/admin` 改的内容存数据库,**不触发部署**,前台立刻生效
- 只有代码变更才会触发 Vercel 构建

### 9.4 SEO 与社交分享

- 每个活动 / 日志页生成 og:image(基于 heroImage)
- `<link rel="alternate" hreflang>` 标注中英版本——仅当该语言版本"完整"(参见 §6.2 回退策略)
- **sitemap.xml**:自动生成,包含总门户 `/` + 所有 3 家学堂的 published 活动 / 日志 / about / contact / book 页面;共约 25+ URL(实际数随内容增长)。草稿、归档、删除均不出现
- robots.txt 允许爬,但屏蔽 `/admin`、`/api/`
- 结构化数据:每个活动加 `Event` schema.org(让 Google 搜索结果显示日期),`location` 字段使用对应 `locations.address`;只对 published + 有未来场次的活动输出
- Google Maps 嵌入:各学堂独立的位置 + 评价链接(来自 `locations.mapEmbedUrl`)

---

## 10. 安全与备份

### 10.1 安全

- 全站 HTTPS(Vercel 自动)
- `/admin` 加 Cloudflare 防爆破(可选 IP 白名单)
- 密码:bcrypt(Payload 默认)
- 敏感配置:Vercel 环境变量,不进 git
- CSP / X-Frame-Options / HSTS 等安全头默认开启
- 预约 API:Turnstile + IP 限流 + 蜜罐

### 10.2 备份

- 数据库:Neon 自动每日快照,保留 7 天
- 文件:R2 高可用 + 每周自动同步到一个独立 S3 bucket
- 代码:GitHub 长期归档

### 10.3 错误监控

- Sentry 收集前后端错误,免费额度 5k/月

---

## 11. 月度成本预算

### 11.1 预期账单

**前 1–2 年:接近 $0/月**(全部在免费额度内,翻译按钮每月 $0–$1)。

### 11.2 上限红线

- **用户设定上限:$200/月**
- **预警机制**(运营层,非 v1 代码实现):
  - Vercel 开启账单告警($50 / $100 / $150 三档,发邮件给 admin)
  - Neon 开启用量告警(免费版自动暂停,不会产生意外账单)
  - Cloudflare R2 开启用量提醒
  - Anthropic API 设置月度上限 $20(后台 dashboard 配置)
- 这部分属于运营约定,不写进代码

### 11.3 付费触发点(预估)

| 服务 | 免费额度 | 超出后的价格 |
|---|---|---|
| Vercel | 100 GB 流量/月 | $20/月 Pro 起 |
| Neon | 0.5 GB 存储 | $0.16/GB/月 |
| Cloudflare R2 | 10 GB 存储 | $0.015/GB/月 |
| Anthropic | 按用量 | 翻译按钮成本可忽略 |
| 域名 | — | 约 $10/年 |

---

## 12. 开放问题与 v1.1+ 路线

### 12.1 v1 实施前需用户确认的小事

- **网络/运营 Gmail 邮箱地址**:用于 SMTP 发送预约通知(如 `mindfulpeaceth@gmail.com`),并生成应用专用密码
- **各学堂 Gmail 邮箱**:各学堂联系邮箱(如 `ruru.bangkok@gmail.com`、`xindeng.chiangmai@gmail.com`),填入 locations 集合;也可先用同一邮箱占位
- **GitHub 用户名**:用于建仓
- **生产域名**:`mindfulpeaceth.com`(已购,接 Vercel 即可)
- **各学堂联系电话 / 微信号 / 地址(精确)**:占位文案上线时逐学堂替换为真实信息
- **普吉学堂中文正式名称**:目前暂用"普吉学堂"占位,确定后更新 locations 集合

### 12.2 v1.1+ 候选(未来再讨论)

- 用户自助取消预约(需邮件二次验证)
- 出席签到 + 课后反馈
- 学员故事 / 心得投稿模块
- 多语言扩展(泰语)
- Newsletter 订阅(目前刻意不做)
- 暗色模式
- **按学堂分权**:staff 只能管理其所属学堂的内容
- **跨学堂聚合视图**:全泰国活动汇总、全泰国日志汇总
- **各学堂独立的微信公众号集成**

---

## 13. 验收标准(v1 上线前必须满足)

### 功能

- [ ] 总门户 `/` 平等展示 3 家学堂(3 张大卡同等大小并排)
- [ ] 顶部学堂切换器在所有 `/{loc}/*` 页面可用,正确切到目标学堂的同一路径(在 `/chiangmai/activities` 切到曼谷应去 `/bangkok/activities`)
- [ ] 1 个门户 + 8 路由模板 × 3 学堂(共 ~25 个 URL)全部双语显示正确
- [ ] 顶栏中英切换无刷新瞬时生效
- [ ] 活动可以通过后台创建,含三种场次生成方式,且必须关联学堂
- [ ] 类别可在创建活动时现场新建
- [ ] 预约表单从学堂首页 hero / 顶栏 / `/{loc}/book` / 活动详情四个入口都能进入
- [ ] 自由咨询的预约表单有"选择学堂"单选,默认当前 URL 的学堂
- [ ] 容量满时正确进入候补流程
- [ ] 同一邮箱/微信可对同一场次多次预约
- [ ] 后台预约表格可筛选、可改状态、可加备注、可导出 CSV
- [ ] Activity / Journal / Reservation 没有 location 时,后台保存时拒绝(服务端校验)
- [ ] Staff 角色权限符合矩阵(可管理所有学堂常规内容,不可改 Users / Settings / Locations)
- [ ] 翻译协助按钮在富文本字段旁可见,点击调用并填入对侧语言
- [ ] Gmail SMTP 能发出:新预约管理员提醒、用户已收到回执(选填邮箱时)、状态确认邮件
- [ ] sitemap 包含所有 3 家学堂的页面及总门户

### 非功能

- [ ] **首屏 LCP** ≤ 2.5s,测量工具 **PageSpeed Insights Mobile**(模拟 Moto G Power / Slow 4G),总门户首页、学堂首页、活动详情、`/{loc}/book` 四类页面都达标
- [ ] **移动端 Lighthouse** ≥ 90 / 性能、可访问、SEO(同样用 PageSpeed Insights)
- [ ] 所有公开页面有完整 og + hreflang(hreflang 受 §6.2 回退规则约束)
- [ ] `/admin` 和 `/api/` 不在 sitemap、被 robots 屏蔽
- [ ] Sentry 接入并能捕获前后端错误(测试用例:故意触发一次)
- [ ] 数据库与文件备份策略已配置并 **执行过一次完整恢复演练**
- [ ] 时区处理:各学堂活动(均在 `Asia/Bangkok` 时区)在中国大陆时区(UTC+8)访问时,前台时间显示和场次卡片标签正确(标 ICT)
- [ ] 并发容量:模拟两个用户同时抢最后一个名额,只有一个能进 pending,另一个收到 capacity_full
- [ ] 邮件失败演练:Gmail SMTP 配错密码,验证预约仍能写入 DB,后台 emailStatus 标 failed

### 内容

- [ ] **占位图全部人工 review**,每张图主观判断是否符合"暖木青苔净化版"气质,不合格的直接换
- [ ] 关于页有学堂故事占位文案(中英)
- [ ] 至少 3 条示例活动 + 1 条示例日志,供首页展示
- [ ] FAQ 有至少 5 条占位 Q/A

---

## 14. 初始数据(种子)

v1 上线前需要预先填的数据(由代码 seed 脚本或 staff 手动填):

- **Users**:
  - 1 个 admin 账号(用户邮箱)
  - 1 个示例 staff 账号(可选,演示权限)
- **Categories**(初始 7 类,可后续增删):
  - 禅修课 / Meditation Class
  - 工作坊 / Workshop
  - 一对一 / One-on-One
  - 共修 / Community Practice
  - 住山 / Residential
  - 正念活动 / Mindful Activity
  - 茶会 / Tea Gathering
- **Locations**(3 行):
  - `bangkok` — 曼谷如如学堂 / Bangkok Ruru Academy
  - `chiangmai` — 清迈心灯学堂 / Chiang Mai Xindeng Academy
  - `phuket` — 普吉学堂(名字待定,占位用 `普吉学堂` / Phuket Academy)
  - 每行含占位 hero 图、占位故事文案、占位 FAQ 5 条、占位团队成员 2 名
- **Activities**:3 条示例活动(分别属于 3 个不同类别),**全部 assigned 到 chiangmai**,每条 2 个 occurrence
- **Journal**:1 条示例日志(6 张占位图 + 双语短文),assigned 到 chiangmai
- **Globals**:
  - portalHome:占位 hero + 网络级文案
  - Settings:站名、OG 默认图、页脚版权、defaultLocation = chiangmai
  - (**不再有** About / Contact globals — 已迁入 locations 集合)
- **Media**:约 15 张 Unsplash 占位图(全部打 `placeholder` 标签)

实施时由 seed 脚本一键灌入,避免上线时空数据库。

---

## 附录 A:关键决策记录

> **架构转型说明(2026-05-12)**:本文档于 2026-05-12 经历了一次重大架构转型——从"单一清迈学堂"扩展为"三学堂网络"。Chunk 1 + Chunk 2 的已合并代码予以保留;新增工作及改造从 Chunk 2.5(Locations 集合)开始。以下决策 #16–19 记录此次转型的核心选择。

| # | 决策 | 选项 | 决定 |
|---|---|---|---|
| 1 | 受众 | A 仅大陆 / B 海外华人 / C 中英并重 / D 其他 | **C** |
| 2 | 活动类型 | 列举 | 禅修课、工作坊、一对一、共修、住山、正念活动(蔬食、插花、整理等);**自由文本类别** |
| 3 | 维护模式 | A 自改代码 / B 简单后台 / C 团队后台 / D 无代码工具 | 最终选 **自建后台**(Payload) |
| 4 | 中国大陆访问 | A 必须 / B 优先 / C 不重要 | **C** |
| 5 | 用户写代码 | 是 / 否 | **否** |
| 6 | 视觉方向 | A 水墨留白 / B 暖木青苔 / C 简净现代东方 | **B(净化版,无装饰)** |
| 7 | 域名 | .org / .academy / .com / .cn | **.com**(用户自购;生产域名 mindfulpeaceth.com) |
| 8 | GitHub 仓库归属 | 个人 / 学堂账号 | **用户个人账号** |
| 9 | 月度预算上限 | — | **$200 USD** |
| 10 | 邮件服务 | Resend / Gmail | **Gmail SMTP** |
| 11 | 自助取消 | 做 / 不做 | **v1 不做** |
| 12 | 候补名单 | 做 / 不做 | **v1 就做** |
| 13 | 暗色模式 | 做 / 不做 | **v1 不做** |
| 14 | 反垃圾 | Cloudflare Turnstile / 其他 | **Turnstile** |
| 15 | 重复预约 | 拒绝 / 允许 | **允许**("帮朋友报名") |
| 16 | 服务范围 | 仅清迈 / 多学堂网络 | **多学堂网络:曼谷如如、清迈心灯、普吉** |
| 17 | 整个网络中文名 | 正念平和·泰国 / 静心学堂·泰国 / 其他 | **静心学堂 · 泰国**(英文 Mindfulpeace Academy Thailand) |
| 18 | 总门户首页三家学堂的权重 | 平等并排 / 主次区分 / 动态轮换 | **平等并排** |
| 19 | 后台按学堂分权 | v1 做 / v1.1 做 | **v1 不做**(所有 staff 全开;v1.1 再分) |
