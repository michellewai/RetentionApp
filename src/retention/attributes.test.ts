import { describe, expect, it } from 'vitest'
import { members } from '../data/mockData.ts'
import type { Member } from '../data/types.ts'
import { ATTRIBUTES } from './attributes.ts'
import { AS_OF, makeMember } from './testMember.ts'

/** The group an attribute puts a member in. */
function groupOf(
  attributeId: string,
  overrides: Partial<Member>,
  visitsPerMonth = 0,
) {
  const attribute = ATTRIBUTES.find((a) => a.id === attributeId)
  if (!attribute) throw new Error(`No attribute called ${attributeId}`)
  return attribute.groupOf(makeMember(overrides), AS_OF, visitsPerMonth)
}

describe('age bands', () => {
  it.each([
    // Birthday is tomorrow, so still 24.
    ['2001-11-11', 'Under 25'],
    // Birthday is today, so 25.
    ['2001-11-10', '25 to 34'],
    ['1991-11-11', '25 to 34'],
    ['1991-11-10', '35 to 44'],
    ['1981-11-11', '35 to 44'],
    ['1981-11-10', '45 and over'],
  ])('puts someone born %s in "%s"', (dateOfBirth, band) => {
    expect(groupOf('age', { dateOfBirth })).toBe(band)
  })
})

describe('visit bands', () => {
  it.each([
    [0, 'Under 3 a month'],
    [2.9, 'Under 3 a month'],
    [3, '3 to 8 a month'],
    [8, '3 to 8 a month'],
    [8.1, 'Over 8 a month'],
  ])('puts %d visits a month in "%s"', (visitsPerMonth, band) => {
    expect(groupOf('visits', {}, visitsPerMonth)).toBe(band)
  })
})

describe('time as a member bands', () => {
  it.each([
    ['2026-10-01', 'Under 6 months'],
    ['2026-03-01', '6 to 12 months'],
    ['2025-06-01', '1 to 2 years'],
    ['2024-06-01', 'Over 2 years'],
  ])('puts someone who joined %s in "%s"', (membershipStartDate, band) => {
    expect(groupOf('tenure', { membershipStartDate })).toBe(band)
  })

  it('measures a cancelled member up to the day they cancelled', () => {
    const lastedTwoMonths = {
      membershipStartDate: '2025-01-01',
      cancelledAt: '2025-03-01',
    }
    expect(groupOf('tenure', lastedTwoMonths)).toBe('Under 6 months')
  })
})

describe('height bands', () => {
  it.each([
    [164, 'Under 165 cm'],
    [165, '165 to 174 cm'],
    [174, '165 to 174 cm'],
    [175, '175 cm and over'],
  ])('puts %i cm in "%s"', (heightCm, band) => {
    expect(groupOf('height', { heightCm })).toBe(band)
  })

  it('has no group when height is not given', () => {
    expect(groupOf('height', { heightCm: null })).toBeNull()
  })
})

describe('project grade bands', () => {
  it.each([
    ['V0', 'Lower'],
    ['V2', 'Lower'],
    ['V3', 'Middle'],
    ['V5', 'Middle'],
    ['V6', 'Upper'],
    ['V10', 'Upper'],
    ['5.6', 'Lower'],
    ['5.8', 'Lower'],
    ['5.9', 'Middle'],
    ['5.10', 'Middle'],
    ['5.11', 'Upper'],
    ['5.13', 'Upper'],
  ] as const)('puts %s in "%s"', (projectGrade, band) => {
    expect(groupOf('projectGrade', { projectGrade })).toBe(band)
  })

  it('has no group when the grade is not given', () => {
    expect(groupOf('projectGrade', { projectGrade: null })).toBeNull()
  })
})

describe('yes or no attributes', () => {
  it('reads a belay test date as passed', () => {
    expect(groupOf('belayTest', { belayTestPassedOn: '2025-02-01' })).toBe('Yes')
    expect(groupOf('belayTest', { belayTestPassedOn: null })).toBe('No')
  })

  it('reads any previous membership as having been a member before', () => {
    const previousMemberships = [
      { membershipType: 'monthly', startDate: '2023-01-01', endDate: '2023-06-01' },
    ] as const
    expect(groupOf('history', { previousMemberships: [...previousMemberships] })).toBe('Yes')
    expect(groupOf('history', { previousMemberships: [] })).toBe('No')
  })
})

describe('none or more attributes', () => {
  it('splits failed payments at one', () => {
    expect(groupOf('failedPayments', { failedPaymentCount: 0 })).toBe('None')
    expect(groupOf('failedPayments', { failedPaymentCount: 1 })).toBe('1 or more')
    expect(groupOf('failedPayments', { failedPaymentCount: 3 })).toBe('1 or more')
  })
})

describe('choice attributes', () => {
  it('shows stored values as readable labels', () => {
    expect(groupOf('preferredDiscipline', { preferredDiscipline: 'top_rope' })).toBe('Top rope')
    expect(groupOf('experienceLevel', { experienceLevel: '1_to_3_years' })).toBe('1 to 3 years')
  })

  it('has no group when the answer is not given', () => {
    expect(groupOf('gender', { gender: null })).toBeNull()
  })
})

describe('the attribute list', () => {
  it('has no duplicate ids', () => {
    const ids = ATTRIBUTES.map((attribute) => attribute.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('puts every fake member in a declared group or none', () => {
    const analysed = members.filter((m) => m.membershipType !== 'day_pass')
    for (const attribute of ATTRIBUTES) {
      if (!attribute.groups) continue
      for (const member of analysed) {
        const group = attribute.groupOf(member, AS_OF, 5)
        if (group !== null) expect(attribute.groups).toContain(group)
      }
    }
  })
})
