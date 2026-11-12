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

// Loose checks that the data still reflects the figures it was calibrated
// to. The ranges allow for random variation, not a change of source.
describe('fake data calibration', () => {
  const share = (count: number, total: number) => count / total
  const visits = new Map<string, number>()
  for (const checkIn of checkIns) {
    visits.set(checkIn.memberId, (visits.get(checkIn.memberId) ?? 0) + 1)
  }

  it('has more men than women', () => {
    const men = members.filter((m) => m.gender === 'man').length
    const women = members.filter((m) => m.gender === 'woman').length
    expect(men).toBeGreaterThan(women)
  })

  it('has most members aged 20 to 30', () => {
    const inBand = members.filter((m) => {
      const born = m.dateOfBirth
      return born > '1995-11-10' && born <= '2006-11-10'
    })
    expect(share(inBand.length, members.length)).toBeGreaterThan(0.5)
  })

  it('matches Canadian average heights to within 2 cm', () => {
    const meanHeight = (gender: 'man' | 'woman') => {
      const heights = members
        .filter((m) => m.gender === gender && m.heightCm !== null)
        .map((m) => m.heightCm ?? 0)
      return heights.reduce((sum, h) => sum + h, 0) / heights.length
    }
    expect(Math.abs(meanHeight('man') - 176.6)).toBeLessThan(2)
    expect(Math.abs(meanHeight('woman') - 163.8)).toBeLessThan(2)
  })

  it('has annual members cancelling less often than monthly members', () => {
    const cancelRate = (type: 'monthly' | 'annual') => {
      const group = members.filter((m) => m.membershipType === type)
      return share(group.filter((m) => m.cancelledAt).length, group.length)
    }
    expect(cancelRate('annual')).toBeLessThan(cancelRate('monthly'))
  })

  it('has about two thirds of day-pass visitors never returning', () => {
    const dayPasses = members.filter((m) => m.membershipType === 'day_pass')
    const once = dayPasses.filter((m) => visits.get(m.id) === 1)
    const neverReturned = share(once.length, dayPasses.length)
    expect(neverReturned).toBeGreaterThan(0.5)
    expect(neverReturned).toBeLessThan(0.8)
  })
})
