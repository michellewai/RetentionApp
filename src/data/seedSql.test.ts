import { describe, expect, it } from 'vitest'
import { makeCheckIn, makeMember } from '../retention/testMember.ts'
import { buildSeedSql, toSqlLiteral } from './seedSql.ts'

describe('toSqlLiteral', () => {
  it('quotes text', () => {
    expect(toSqlLiteral('monthly')).toBe("'monthly'")
  })

  it('doubles a quote inside text so a name cannot break the statement', () => {
    expect(toSqlLiteral("Sam O'Neil")).toBe("'Sam O''Neil'")
  })

  it('writes missing values as null, not as the text "null"', () => {
    expect(toSqlLiteral(null)).toBe('null')
  })

  it('writes numbers and booleans bare', () => {
    expect(toSqlLiteral(85)).toBe('85')
    expect(toSqlLiteral(true)).toBe('true')
    expect(toSqlLiteral(false)).toBe('false')
  })
})

describe('buildSeedSql', () => {
  const member = makeMember({
    id: 'm001',
    name: "Sam O'Neil",
    heightCm: 172,
    previousMemberships: [
      { membershipType: 'monthly', startDate: '2023-01-01', endDate: '2023-06-01' },
    ],
  })
  const sql = buildSeedSql([member], [makeCheckIn(member, '2026-11-10')])

  it('wraps everything in one transaction', () => {
    expect(sql).toContain('begin;')
    expect(sql.trimEnd().endsWith('commit;')).toBe(true)
  })

  it('empties the tables first so it can be run again', () => {
    expect(sql.indexOf('truncate table')).toBeLessThan(sql.indexOf('insert into'))
  })

  it('inserts members before the rows that refer to them', () => {
    const members = sql.indexOf('insert into public.members')
    const previous = sql.indexOf('insert into public.previous_memberships')
    const checkIns = sql.indexOf('insert into public.check_ins')
    expect(members).toBeGreaterThan(-1)
    expect(members).toBeLessThan(previous)
    expect(previous).toBeLessThan(checkIns)
  })

  it('writes each row with its values', () => {
    expect(sql).toContain("('m001', 'Sam O''Neil', '1995-06-15', 'monthly'")
    expect(sql).toContain("('m001', 'monthly', '2023-01-01', '2023-06-01')")
    expect(sql).toContain("'m001', '2026-11-10T12:00:00.000Z')")
  })

  it('gives every member row a value for every column', () => {
    const columns = sql
      .slice(sql.indexOf('(', sql.indexOf('public.members')) + 1)
      .split(')')[0]
      .split(', ')
    const memberOnly = buildSeedSql([makeMember({ id: 'm002' })], [])
    const row = memberOnly.slice(memberOnly.indexOf("('m002'"))
    const values = row.slice(1, row.indexOf(');')).split(', ')
    expect(values).toHaveLength(columns.length)
  })

  it('skips the insert for a table with no rows', () => {
    const memberOnly = buildSeedSql([makeMember()], [])
    expect(memberOnly).not.toContain('insert into public.check_ins')
    expect(memberOnly).not.toContain('insert into public.previous_memberships')
  })
})
