import { describe, expect, it } from 'vitest'
import { parseDataSource } from './config.ts'

describe('parseDataSource', () => {
  it('uses the data in code when the setting is missing or blank', () => {
    expect(parseDataSource(undefined)).toBe('code')
    expect(parseDataSource('')).toBe('code')
    expect(parseDataSource('  ')).toBe('code')
  })

  it('accepts each known source', () => {
    expect(parseDataSource('code')).toBe('code')
    expect(parseDataSource('supabase')).toBe('supabase')
  })

  it('ignores case and surrounding spaces', () => {
    expect(parseDataSource(' Supabase ')).toBe('supabase')
  })

  it('rejects an unknown value instead of guessing', () => {
    expect(() => parseDataSource('postgres')).toThrow(
      'VITE_DATA_SOURCE is "postgres". Use one of: code, supabase.',
    )
  })
})
