import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'
import { after } from 'next/server'
import { mediaCoverJob } from '../lib/media-cover-state'
import { newCoverJob, processMediaCover } from '../lib/media-cover-jobs'

export const prepareMediaCover: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.context.skipCoverGeneration) return data
  // Only this hook and the authenticated generation endpoint may change state.
  delete data.cardCover
  delete data.cardCoverJob
  if (!req.file?.data?.length || req.context.skipAutoAlt || req.context.skipUrlSync) return data
  data.cardCover = null
  data.cardCoverJob = data.width && data.height && data.height > data.width && data.filename
    ? newCoverJob(data.filename) : null
  return data
}

export const scheduleMediaCover: CollectionAfterChangeHook = ({ doc, req }) => {
  if (req.context.skipCoverGeneration || req.context.skipAutoAlt || req.context.skipUrlSync) return doc
  if (!req.file?.data?.length || mediaCoverJob(doc.cardCoverJob)?.status !== 'queued') return doc
  try {
    // Runs after the upload transaction commits; never hold up the editor save.
    after(async () => {
      try { await processMediaCover(req.payload, doc.id) }
      catch { req.payload.logger.error('[media-cover] Deferred generation failed; retry from Media.') }
    })
  } catch {
    // Scripts lack Next's after() context. The durable queued job remains retryable.
    req.payload.logger.warn('[media-cover] Background processing unavailable; retry from Media.')
  }
  return doc
}
