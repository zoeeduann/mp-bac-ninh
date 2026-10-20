/**
 * Public pages are ISR (see the [locale] layout). Refresh them right after a
 * CMS write instead of waiting out the five-minute revalidate window. The
 * single-location site is small, so every public page is invalidated at once.
 * Never fails the write: outside a Next.js request (seed scripts, tests) the
 * call is skipped or only logged.
 */
export async function invalidatePublicPages(): Promise<void> {
  if (process.env.NODE_ENV === 'test') return

  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
  } catch (error) {
    console.error(
      '[public-cache] page invalidation failed:',
      error instanceof Error ? error.message : error,
    )
  }
}

/** Payload afterChange/afterDelete hook form of invalidatePublicPages. */
export async function invalidatePublicPagesHook<T>({ doc }: { doc: T }): Promise<T> {
  await invalidatePublicPages()
  return doc
}
