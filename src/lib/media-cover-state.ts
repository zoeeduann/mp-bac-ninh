export interface MediaCoverJob {
  token: string
  sourceFilename: string
  status: 'queued' | 'processing' | 'ready' | 'failed' | 'unconfigured'
  requestedAt: string
  error?: string
}

export function mediaCoverJob(value: unknown): MediaCoverJob | null {
  if (!value || typeof value !== 'object') return null
  const job = value as MediaCoverJob
  return typeof job.token === 'string' && typeof job.sourceFilename === 'string'
    && typeof job.requestedAt === 'string'
    && ['queued', 'processing', 'ready', 'failed', 'unconfigured'].includes(job.status)
    ? job : null
}

/** Generated covers are ordinary media records an editor can pick directly.
 * Their name is what tells finished artwork apart from a source poster. */
export function coverFilename(sourceId: number, token: string): string {
  return `cover-${sourceId}-${token}.webp`
}

export function isGeneratedCover(filename: string | null | undefined): boolean {
  return !!filename && /^cover-\d+-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.webp$/.test(filename)
}

export function coverJobIsBusy(job: MediaCoverJob | null): boolean {
  return !!job && ['queued', 'processing'].includes(job.status)
    && Date.now() - Date.parse(job.requestedAt) < 5 * 60_000
}
