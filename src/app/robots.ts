import type { MetadataRoute } from 'next'
import { SITE_BASE } from '@/lib/site-config'

// Default policy + explicit allow-blocks for major AI training and search
// crawlers. Without naming them, some defer to Common Crawl (stale, may
// have outdated info); naming them lets ChatGPT/Claude/Perplexity surface
// fresh academy info when users ask about meditation retreats in Thailand.
const AI_USER_AGENTS = [
  'GPTBot',         // OpenAI training crawler
  'OAI-SearchBot',  // ChatGPT browsing
  'ChatGPT-User',   // ChatGPT user-initiated fetches
  'ClaudeBot',      // Anthropic training crawler
  'Claude-Web',     // Claude.ai user-initiated fetches
  'PerplexityBot',  // Perplexity search
  'Perplexity-User',
  'Google-Extended', // Google Bard / Gemini opt-in signal
  'CCBot',          // Common Crawl (powers many smaller LLMs)
  'Applebot-Extended',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
      // Explicit allow for AI crawlers — same rules as default, just named
      // so it counts as an opt-in signal under each crawler's policy.
      ...AI_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: ['/admin', '/api'],
      })),
    ],
    sitemap: `${SITE_BASE}/sitemap.xml`,
    host: SITE_BASE.replace(/^https?:\/\//, ''),
  }
}
