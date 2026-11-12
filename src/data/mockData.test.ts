import { describe, expect, it } from 'vitest'
import { checkIns, members } from './mockData.ts'

describe('fake data', () => {
  const byId = new Map(members.map((member) => [member.id, member]))

  it('gives every member a unique id', () => {
    expect(byId.size).toBe(members.length)
  })

  it('only has check-ins that the member could have made', () => {
    for (const checkIn of checkIns) {
      const member = byId.get(checkIn.memberId)
      expect(member, `${checkIn.id} has an unknown member`).toBeDefined()
      if (!member) continue
      const date = checkIn.checkedInAt.slice(0, 10)

      expect(date >= member.membershipStartDate, `${checkIn.id} is before joining`).toBe(true)
      if (member.cancelledAt) {
        expect(date <= member.cancelledAt, `${checkIn.id} is after cancelling`).toBe(true)
      }
      if (member.frozenFrom && member.frozenTo) {
        const duringFreeze = date >= member.frozenFrom && date <= member.frozenTo
        expect(duringFreeze, `${checkIn.id} is during a freeze`).toBe(false)
      }
    }
  })
})
