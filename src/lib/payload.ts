import { getPayload } from 'payload'
import type { Payload } from 'payload'
import configPromise from '../payload.config'

let _payload: Payload | null = null
export async function getPayloadClient(): Promise<Payload> {
  if (!_payload) _payload = await getPayload({ config: configPromise })
  return _payload
}
