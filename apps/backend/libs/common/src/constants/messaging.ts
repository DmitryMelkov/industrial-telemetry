/** Kafka topics */
export const KAFKA_TOPICS = {
  TELEMETRY_RAW: 'telemetry.raw',
} as const;

/** Redis pub/sub channels */
export const REDIS_CHANNELS = {
  TELEMETRY_UPDATES: 'telemetry:updates',
  ALERTS_UPDATES: 'alerts:updates',
} as const;

/** Redis cache key prefixes */
export const REDIS_KEYS = {
  overview: (siteId: string) => `cache:overview:${siteId}`,
} as const;
