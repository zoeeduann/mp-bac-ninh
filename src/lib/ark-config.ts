export const ARK_UNCONFIGURED_MESSAGE = '图片生成服务尚未配置，请联系管理员设置 ARK_SEA_API_KEY（或 ARK_API_KEY）。'

export interface ArkTarget { apiKey: string; endpoint: string; model: string }

// Keys, endpoints and model IDs are isolated per region. The Southeast Asia
// (Johor) host sits next to Vercel's Singapore region, so it wins when set;
// the Beijing host often fails the cross-border connect.
export function arkTarget(): ArkTarget | null {
  const sea = process.env.ARK_SEA_API_KEY
  if (sea) {
    return {
      apiKey: sea,
      endpoint: 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations',
      model: process.env.ARK_SEA_IMAGE_MODEL || 'dola-seedream-5-0-pro-260628',
    }
  }
  const beijing = process.env.ARK_API_KEY
  if (beijing) {
    return {
      apiKey: beijing,
      // Overridable so a different region host or model release needs no code change.
      endpoint: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
      model: process.env.ARK_IMAGE_MODEL || 'doubao-seedream-5-0-pro-260628',
    }
  }
  return null
}
