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

export function coverJobIsBusy(job: MediaCoverJob | null): boolean {
  return !!job && ['queued', 'processing'].includes(job.status)
    && Date.now() - Date.parse(job.requestedAt) < 5 * 60_000
}
