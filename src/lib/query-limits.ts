import type { CollectionBeforeOperationHook, Config, Plugin } from 'payload'

// Payload has no maximum page size for REST: `?limit=0` or `?pagination=false` returns every
// document in one response. This caps requests that arrive over REST or GraphQL; the site's own
// server code (Local API) is not affected. Depth is capped separately with `maxDepth`.

export const MAX_PAGE_SIZE = 100
export const MAX_DEPTH = 3

const capExternalQueries: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  // Single-document reads (findByID) have no page size.
  if (req.payloadAPI === 'local' || operation !== 'read' || 'id' in args) return args
  // No limit given: keep Payload's default page size. 0 (meaning "all") or anything invalid: the cap.
  const requested = args.limit === undefined ? undefined : Number(args.limit)
  const limit =
    requested === undefined
      ? undefined
      : Number.isFinite(requested) && requested > 0
        ? Math.min(requested, MAX_PAGE_SIZE)
        : MAX_PAGE_SIZE
  return { ...args, limit, pagination: true }
}

export const queryLimits: Plugin = (config: Config): Config => ({
  ...config,
  maxDepth: MAX_DEPTH,
  collections: config.collections?.map((collection) => ({
    ...collection,
    hooks: {
      ...collection.hooks,
      beforeOperation: [...(collection.hooks?.beforeOperation ?? []), capExternalQueries],
    },
  })),
})
