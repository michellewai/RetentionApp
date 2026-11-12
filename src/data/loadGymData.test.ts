import { describe, expect, it } from 'vitest'
import { fetchAllPages, toCheckIn, toMember } from './loadGymData.ts'
import type { MemberRow } from './loadGymData.ts'

const memberRow: MemberRow = {
  id: 'm001',
  name: 'Kai Novak',
  date_of_birth: '1989-09-08',
  membership_type: 'monthly',
  membership_start_date: '2026-09-28',
  frozen_from: null,
  frozen_to: null,
  cancelled_at: '2026-10-08',
  membership_end_date: '2026-10-25',
  cancellation_reason: 'too_busy',
  price: 85,
  failed_payment_count: 2,
  acquisition_source: 'friend_referral',
  day_pass_visits_before_joining: 3,
  took_intro_class: true,
  had_orientation: true,
  belay_test_passed_on: '2026-10-01',
  owns_shoes: false,
  owns_harness: true,
  experience_level: 'first_timer',
  preferred_discipline: null,
  max_grade: 'V2',
  project_grade: 'V3',
  height_cm: 181,
  gender: 'man',
  main_goal: 'fitness',
  postal_area: 'M5V',
  previous_memberships: [],
}

describe('toMember', () => {
  it('maps every database column to its field', () => {
    expect(toMember(memberRow)).toEqual({
      id: 'm001',
      name: 'Kai Novak',
      dateOfBirth: '1989-09-08',
      membershipType: 'monthly',
      membershipStartDate: '2026-09-28',
      frozenFrom: null,
      frozenTo: null,
      cancelledAt: '2026-10-08',
      membershipEndDate: '2026-10-25',
      cancellationReason: 'too_busy',
      previousMemberships: [],
      price: 85,
      failedPaymentCount: 2,
      acquisitionSource: 'friend_referral',
      dayPassVisitsBeforeJoining: 3,
      tookIntroClass: true,
      hadOrientation: true,
      belayTestPassedOn: '2026-10-01',
      ownsShoes: false,
      ownsHarness: true,
      experienceLevel: 'first_timer',
      preferredDiscipline: null,
      maxGrade: 'V2',
      projectGrade: 'V3',
      heightCm: 181,
      gender: 'man',
      mainGoal: 'fitness',
      postalArea: 'M5V',
    })
  })

  it('turns a price that arrives as text into a number', () => {
    const row = { ...memberRow, price: '85.00' as unknown as number }
    expect(toMember(row).price).toBe(85)
  })

  it('puts previous memberships oldest first', () => {
    const row: MemberRow = {
      ...memberRow,
      previous_memberships: [
        { membership_type: 'monthly', start_date: '2024-07-13', end_date: '2025-06-01' },
        { membership_type: 'punch_pass', start_date: '2023-05-19', end_date: '2023-10-18' },
      ],
    }
    expect(toMember(row).previousMemberships).toEqual([
      { membershipType: 'punch_pass', startDate: '2023-05-19', endDate: '2023-10-18' },
      { membershipType: 'monthly', startDate: '2024-07-13', endDate: '2025-06-01' },
    ])
  })
})

describe('toCheckIn', () => {
  it('maps the columns and writes the time in the Z form', () => {
    const row = {
      id: 'c00001',
      member_id: 'm001',
      checked_in_at: '2026-08-11T06:39:38+00:00',
    }
    expect(toCheckIn(row)).toEqual({
      id: 'c00001',
      memberId: 'm001',
      checkedInAt: '2026-08-11T06:39:38.000Z',
    })
  })

  it('converts a time given in another zone to UTC', () => {
    const row = {
      id: 'c00002',
      member_id: 'm001',
      checked_in_at: '2026-08-11T20:30:00-04:00',
    }
    expect(toCheckIn(row).checkedInAt).toBe('2026-08-12T00:30:00.000Z')
  })
})

describe('fetchAllPages', () => {
  /** A fake table of numbered rows that records each range asked for. */
  function fakeTable(total: number) {
    const requests: [number, number][] = []
    const fetchPage = async (from: number, to: number) => {
      requests.push([from, to])
      const rows = []
      for (let i = from; i <= to && i < total; i++) rows.push(i)
      return { rows, total }
    }
    return { requests, fetchPage }
  }

  it('makes one request when everything fits on a page', async () => {
    const table = fakeTable(3)
    expect(await fetchAllPages(table.fetchPage, 10)).toEqual([0, 1, 2])
    expect(table.requests).toEqual([[0, 9]])
  })

  it('fetches every page of a larger table, in order', async () => {
    const table = fakeTable(25)
    const rows = await fetchAllPages(table.fetchPage, 10)
    expect(rows).toEqual(Array.from({ length: 25 }, (_, i) => i))
    expect(table.requests).toEqual([
      [0, 9],
      [10, 19],
      [20, 29],
    ])
  })

  it('does not ask for an extra page when the total is an exact multiple', async () => {
    const table = fakeTable(20)
    expect(await fetchAllPages(table.fetchPage, 10)).toHaveLength(20)
    expect(table.requests).toHaveLength(2)
  })

  it('returns nothing for an empty table', async () => {
    const table = fakeTable(0)
    expect(await fetchAllPages(table.fetchPage, 10)).toEqual([])
  })

  it('passes on a failed request', async () => {
    const failing = async () => {
      throw new Error('Could not load members: permission denied')
    }
    await expect(fetchAllPages(failing, 10)).rejects.toThrow('permission denied')
  })
})
