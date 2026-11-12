import { describe, expect, it } from 'vitest'
import { AS_OF, makeCheckIn, makeMember } from './testMember.ts'
import { getVisitsPerMonth } from './usage.ts'

// The data starts 30.4 days' worth of whole days before AS_OF: 12 Oct to
// 10 Nov is 30 days, so one visit in that period is 1 / 30 * 30.4 a month.
const DATA_START = '2026-10-12'
const PERIOD_DAYS = 30

describe('getVisitsPerMonth', () => {
  // A second member whose check-ins pin the start and end of the data.
  const anchor = makeMember()
  const anchorVisits = [
    makeCheckIn(anchor, DATA_START),
    makeCheckIn(anchor, AS_OF),
  ]

  it('averages visits over the period covered by the data', () => {
    const member = makeMember()
    const rates = getVisitsPerMonth(
      [anchor, member],
      [
        ...anchorVisits,
        makeCheckIn(member, '2026-10-20'),
        makeCheckIn(member, '2026-10-27'),
        makeCheckIn(member, '2026-11-03'),
      ],
      AS_OF,
    )
    expect(rates.get(member.id)).toBeCloseTo((3 / PERIOD_DAYS) * 30.4)
  })

  it('is zero for a member with no check-ins', () => {
    const member = makeMember()
    const rates = getVisitsPerMonth([anchor, member], anchorVisits, AS_OF)
    expect(rates.get(member.id)).toBe(0)
  })

  it('counts only from the day a new member joined', () => {
    // Joined 10 days before AS_OF and visited twice.
    const member = makeMember({ membershipStartDate: '2026-11-01' })
    const rates = getVisitsPerMonth(
      [anchor, member],
      [
        ...anchorVisits,
        makeCheckIn(member, '2026-11-01'),
        makeCheckIn(member, '2026-11-08'),
      ],
      AS_OF,
    )
    expect(rates.get(member.id)).toBeCloseTo((2 / 10) * 30.4)
  })

  it('stops counting on the day a member cancelled', () => {
    // Cancelled 10 days into the data, having visited twice.
    const member = makeMember({ cancelledAt: '2026-10-21' })
    const rates = getVisitsPerMonth(
      [anchor, member],
      [
        ...anchorVisits,
        makeCheckIn(member, '2026-10-13'),
        makeCheckIn(member, '2026-10-20'),
      ],
      AS_OF,
    )
    expect(rates.get(member.id)).toBeCloseTo((2 / 10) * 30.4)
  })

  it('leaves frozen days out of the period', () => {
    // Frozen for 10 of the 30 days, with two visits in the other 20.
    const member = makeMember({
      frozenFrom: '2026-10-22',
      frozenTo: '2026-10-31',
    })
    const rates = getVisitsPerMonth(
      [anchor, member],
      [
        ...anchorVisits,
        makeCheckIn(member, '2026-10-15'),
        makeCheckIn(member, '2026-11-05'),
      ],
      AS_OF,
    )
    expect(rates.get(member.id)).toBeCloseTo((2 / 20) * 30.4)
  })

  it('uses at least a week, so a first-day visit is not a daily habit', () => {
    const member = makeMember({ membershipStartDate: AS_OF })
    const rates = getVisitsPerMonth(
      [anchor, member],
      [...anchorVisits, makeCheckIn(member, AS_OF)],
      AS_OF,
    )
    expect(rates.get(member.id)).toBeCloseTo((1 / 7) * 30.4)
  })
})
