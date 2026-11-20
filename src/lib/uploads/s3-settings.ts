// The S3 storage settings (D-086), parsed on their own so the startup check (src/lib/env.ts) can
// read them without loading the S3 client.

type Env = Record<string, string | undefined>

export const S3_VARIABLES = ['S3_BUCKET', 'S3_REGION', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const

export type S3Settings = { bucket: string; region: string; endpoint: string; accessKeyId: string; secretAccessKey: string }

/** All five settings, or which are missing when some but not all are set; undefined when none are. */
export function s3Settings(env: Env): S3Settings | { missing: string[] } | undefined {
  const values = S3_VARIABLES.map((name) => env[name]?.trim() ?? '')
  const missing = S3_VARIABLES.filter((_, n) => !values[n])
  if (missing.length === S3_VARIABLES.length) return undefined
  if (missing.length > 0) return { missing }
  const [bucket, region, endpoint, accessKeyId, secretAccessKey] = values as [string, string, string, string, string]
  return { bucket, region, endpoint, accessKeyId, secretAccessKey }
}
