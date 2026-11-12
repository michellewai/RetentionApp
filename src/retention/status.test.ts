import { describe, expect, it } from 'vitest'
import { getMemberStatus, getStatuses, isRetained } from './status.ts'
import { AS_OF, makeCheckIn, makeMember } from './testMember.ts'

// Dates counted back from AS_OF (10 Nov 2026).
const DAYS_AGO_30 = '2026-10-11'
const DAYS_AGO_31 = '2026-10-10'
const DAYS_AGO_60 = '2026-09-11'
const DAYS_AGO_61 = '2026-09-10'
const YESTERDAY = '2026-11-09'
const TOMORROW = '2026-11-11'

describe('getMemberStatus', () => {
  describe('days since last visit', () => {
    it('is active when the last visit was today', () => {
      expect(getMemberStatus(makeMember(), AS_OF, AS_OF)).toBe('active')
    })

    it('is active at exactly 30 days', () => {
      expect(getMemberStatus(makeMember(), DAYS_AGO_30, AS_OF)).toBe('active')
    })

    it('is at risk at 31 days', () => {
      expect(getMemberStatus(makeMember(), DAYS_AGO_31, AS_OF)).toBe('at_risk')
    })

    it('keeps a monthly member at risk, not churned, however long the gap', () => {
      expect(getMemberStatus(makeMember(), DAYS_AGO_61, AS_OF)).toBe('at_risk')
    })

    it('treats a contract member with no check-ins as at risk', () => {
      expect(getMemberStatus(makeMember(), null, AS_OF)).toBe('at_risk')
    })
  })

  describe('pass holders', () => {
    const punchPass = makeMember({ membershipType: 'punch_pass' })

    it('is at risk at exactly 60 days', () => {
      expect(getMemberStatus(punchPass, DAYS_AGO_60, AS_OF)).toBe('at_risk')
    })

    it('is churned at 61 days', () => {
      expect(getMemberStatus(punchPass, DAYS_AGO_61, AS_OF)).toBe('churned')
    })

    it('applies the same rule to day passes', () => {
      const dayPass = makeMember({ membershipType: 'day_pass' })
      expect(getMemberStatus(dayPass, DAYS_AGO_61, AS_OF)).toBe('churned')
    })

    it('is churned with no check-ins at all', () => {
      expect(getMemberStatus(punchPass, null, AS_OF)).toBe('churned')
    })
  })

  describe('cancellation', () => {
    it('is churned when cancelled today, even after visiting today', () => {
      const member = makeMember({ cancelledAt: AS_OF })
      expect(getMemberStatus(member, AS_OF, AS_OF)).toBe('churned')
    })

    it('is churned when cancelled in the past', () => {
      const member = makeMember({ cancelledAt: DAYS_AGO_30 })
      expect(getMemberStatus(member, AS_OF, AS_OF)).toBe('churned')
    })

    it('is not yet churned when the cancellation is dated tomorrow', () => {
      const member = makeMember({ cancelledAt: TOMORROW })
      expect(getMemberStatus(member, AS_OF, AS_OF)).toBe('active')
    })
  })

  describe('freeze', () => {
    it('is frozen on the first day of the freeze', () => {
      const member = makeMember({ frozenFrom: AS_OF, frozenTo: '2026-12-01' })
      expect(getMemberStatus(member, AS_OF, AS_OF)).toBe('frozen')
    })

    it('is frozen on the last day of the freeze', () => {
      const member = makeMember({ frozenFrom: DAYS_AGO_30, frozenTo: AS_OF })
      expect(getMemberStatus(member, AS_OF, AS_OF)).toBe('frozen')
    })

    it('is no longer frozen the day after the freeze ends', () => {
      const member = makeMember({ frozenFrom: DAYS_AGO_30, frozenTo: YESTERDAY })
      expect(getMemberStatus(member, AS_OF, AS_OF)).toBe('active')
    })

    it('is not frozen before the freeze starts', () => {
      const member = makeMember({ frozenFrom: TOMORROW, frozenTo: '2026-12-01' })
      expect(getMemberStatus(member, AS_OF, AS_OF)).toBe('active')
    })

    it('stays frozen, not at risk, with no recent visit', () => {
      const member = makeMember({ frozenFrom: DAYS_AGO_60, frozenTo: TOMORROW })
      expect(getMemberStatus(member, DAYS_AGO_61, AS_OF)).toBe('frozen')
    })

    it('is churned when both cancelled and frozen', () => {
      const member = makeMember({
        cancelledAt: YESTERDAY,
        frozenFrom: DAYS_AGO_30,
        frozenTo: TOMORROW,
      })
      expect(getMemberStatus(member, AS_OF, AS_OF)).toBe('churned')
    })
  })
})

describe('isRetained', () => {
  it('counts active and frozen as retained', () => {
    expect(isRetained('active')).toBe(true)
    expect(isRetained('frozen')).toBe(true)
  })

  it('counts at risk and churned as not retained', () => {
    expect(isRetained('at_risk')).toBe(false)
    expect(isRetained('churned')).toBe(false)
  })
})

describe('getStatuses', () => {
  it('uses the latest check-in in the data as the as-of date', () => {
    const recent = makeMember()
    const lapsed = makeMember()
    const { asOf, statuses } = getStatuses(
      [recent, lapsed],
      [makeCheckIn(lapsed, DAYS_AGO_31), makeCheckIn(recent, AS_OF)],
    )
    expect(asOf).toBe(AS_OF)
    expect(statuses.get(recent.id)).toBe('active')
    expect(statuses.get(lapsed.id)).toBe('at_risk')
  })

  it("uses a member's most recent visit whatever order check-ins arrive in", () => {
    const member = makeMember()
    const other = makeMember()
    const { statuses } = getStatuses(
      [member, other],
      [
        makeCheckIn(member, DAYS_AGO_30),
        makeCheckIn(other, AS_OF),
        makeCheckIn(member, DAYS_AGO_61),
      ],
    )
    expect(statuses.get(member.id)).toBe('active')
  })

  it('gives a status to members with no check-ins', () => {
    const visitor = makeMember()
    const neverSeen = makeMember()
    const { statuses } = getStatuses(
      [visitor, neverSeen],
      [makeCheckIn(visitor, AS_OF)],
    )
    expect(statuses.get(neverSeen.id)).toBe('at_risk')
  })
})
