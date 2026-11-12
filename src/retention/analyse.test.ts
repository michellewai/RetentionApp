import { describe, expect, it } from 'vitest'
import { NOT_GIVEN, analyseRetention } from './analyse.ts'
import { AS_OF, makeCheckIn, makeMember } from './testMember.ts'

/**
 * Five people, one of each outcome plus a day-pass visitor:
 * active and frozen are retained; churned and at risk are not.
 */
function scenario() {
  const active = makeMember({
    experienceLevel: 'first_timer',
    postalArea: 'M5V',
  })
  const churned = makeMember({
    experienceLevel: 'first_timer',
    cancelledAt: '2026-10-01',
    postalArea: 'L5B',
  })
  const frozen = makeMember({
    membershipType: 'annual',
    frozenFrom: '2026-11-01',
    frozenTo: '2026-11-30',
  })
  const atRisk = makeMember({
    membershipType: 'punch_pass',
    experienceLevel: 'over_3_years',
    postalArea: 'M5V',
  })
  const dayPass = makeMember({ membershipType: 'day_pass' })

  const checkIns = [
    makeCheckIn(active, AS_OF),
    makeCheckIn(churned, '2026-09-20'),
    makeCheckIn(frozen, '2026-10-30'),
    makeCheckIn(atRisk, '2026-10-01'),
    makeCheckIn(dayPass, AS_OF),
  ]
  return analyseRetention([active, churned, frozen, atRisk, dayPass], checkIns)
}

function attribute(id: string) {
  const found = scenario().attributes.find((a) => a.id === id)
  if (!found) throw new Error(`No attribute called ${id}`)
  return found
}

describe('analyseRetention', () => {
  it('leaves day-pass visitors out of the totals', () => {
    expect(scenario().total).toBe(4)
  })

  it('counts each status', () => {
    expect(scenario().statusCounts).toEqual({
      active: 1,
      frozen: 1,
      at_risk: 1,
      churned: 1,
    })
  })

  it('counts active and frozen members as retained', () => {
    const summary = scenario()
    expect(summary.retained).toBe(2)
    expect(summary.rate).toBe(0.5)
  })

  it('reports the latest check-in date as the as-of date', () => {
    expect(scenario().asOf).toBe(AS_OF)
  })

  it('breaks retention down by group', () => {
    const groups = attribute('experienceLevel').groups
    expect(groups.map((group) => group.label)).toEqual([
      'First timer',
      'Over 3 years',
      NOT_GIVEN,
    ])
    expect(groups[0]).toMatchObject({ total: 2, retained: 1, rate: 0.5 })
    expect(groups[1]).toMatchObject({ total: 1, retained: 0, rate: 0 })
    expect(groups[2]).toMatchObject({ total: 1, retained: 1, rate: 1 })
  })

  it('leaves out groups with no members', () => {
    const labels = attribute('experienceLevel').groups.map((g) => g.label)
    expect(labels).not.toContain('Under 1 year')
  })

  it('has no day-pass group under membership type', () => {
    const labels = attribute('membershipType').groups.map((g) => g.label)
    expect(labels).toEqual(['Monthly', 'Annual', 'Punch pass'])
  })

  it('sorts postal areas alphabetically with "Not given" last', () => {
    const labels = attribute('postalArea').groups.map((g) => g.label)
    expect(labels).toEqual(['L5B', 'M5V', NOT_GIVEN])
  })

  it('accounts for every member in every attribute', () => {
    const summary = scenario()
    for (const breakdown of summary.attributes) {
      const total = breakdown.groups.reduce((sum, g) => sum + g.total, 0)
      const retained = breakdown.groups.reduce((sum, g) => sum + g.retained, 0)
      expect(total, breakdown.label).toBe(summary.total)
      expect(retained, breakdown.label).toBe(summary.retained)
    }
  })
})
