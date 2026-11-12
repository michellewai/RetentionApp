import type { CheckIn, Member } from '../data/types.ts'

/** The date every retention test treats as "today". */
export const AS_OF = '2026-11-10'

let nextId = 1

/**
 * Builds a member for tests: a long-standing monthly member with no
 * optional answers. Pass only the fields a test cares about.
 */
export function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: `test-${nextId++}`,
    name: 'Test Member',
    dateOfBirth: '1995-06-15',
    membershipType: 'monthly',
    membershipStartDate: '2025-01-01',
    frozenFrom: null,
    frozenTo: null,
    cancelledAt: null,
    membershipEndDate: null,
    cancellationReason: null,
    previousMemberships: [],
    price: 85,
    failedPaymentCount: 0,
    acquisitionSource: null,
    dayPassVisitsBeforeJoining: 0,
    tookIntroClass: false,
    hadOrientation: true,
    belayTestPassedOn: null,
    ownsShoes: false,
    ownsHarness: false,
    experienceLevel: null,
    preferredDiscipline: null,
    maxGrade: null,
    projectGrade: null,
    heightCm: null,
    gender: null,
    mainGoal: null,
    postalArea: null,
    ...overrides,
  }
}

/** Builds a check-in for a member at midday on the given date. */
export function makeCheckIn(member: Member, date: string): CheckIn {
  return {
    id: `check-in-${member.id}-${date}`,
    memberId: member.id,
    checkedInAt: `${date}T12:00:00.000Z`,
  }
}
