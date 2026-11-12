export const DATA_SOURCES = ['code', 'supabase'] as const
export type DataSource = (typeof DATA_SOURCES)[number]

/** Used when VITE_DATA_SOURCE is not set: needs no database or keys. */
export const DEFAULT_DATA_SOURCE: DataSource = 'code'

/**
 * Reads the VITE_DATA_SOURCE setting. Anything other than a known source
 * is an error, so a typo cannot quietly fall back to the wrong data.
 */
export function parseDataSource(value: string | undefined): DataSource {
  const setting = value?.trim().toLowerCase()
  if (!setting) return DEFAULT_DATA_SOURCE
  const match = DATA_SOURCES.find((source) => source === setting)
  if (!match) {
    throw new Error(
      `VITE_DATA_SOURCE is "${value}". Use one of: ${DATA_SOURCES.join(', ')}.`,
    )
  }
  return match
}

/**
 * Where the app reads its members and check-ins from:
 * - 'code': the generated fake data in src/data/mockData.ts
 * - 'supabase': the same fake data, loaded from the Supabase database
 */
export function getDataSource() {
  return parseDataSource(import.meta.env.VITE_DATA_SOURCE)
}
