import type { CheckIn, Member } from '../data/types.ts'

const DAY_MS = 24 * 60 * 60 * 1000
const DAYS_PER_MONTH = 30.4
/** Shortest period a rate is worked out over, so one early visit by a
 * brand-new member does not read as a visit every day. */
const MIN_PERIOD_DAYS = 7

const toDay = (date: string) => Math.round(Date.parse(date) / DAY_MS)

/**
 * Each member's average check-ins per month while they could have visited:
 * from the start of the data or their join date, whichever is later, until
 * they cancelled or the as-of date. Days on a freeze are not counted.
 */
export function getVisitsPerMonth(
  members: Member[],
  checkIns: CheckIn[],
  asOf: string,
) {
  const visitDays = new Map<string, number[]>()
  let dataStart = toDay(asOf)
  for (const checkIn of checkIns) {
    const day = toDay(checkIn.checkedInAt.slice(0, 10))
    visitDays.set(checkIn.memberId, [...(visitDays.get(checkIn.memberId) ?? []), day])
    if (day < dataStart) dataStart = day
  }

  const rates = new Map<string, number>()
  for (const member of members) {
    const from = Math.max(dataStart, toDay(member.membershipStartDate))
    const to = Math.min(toDay(member.cancelledAt ?? asOf), toDay(asOf))

    let frozenDays = 0
    if (member.frozenFrom && member.frozenTo) {
      const frozenFrom = Math.max(from, toDay(member.frozenFrom))
      const frozenTo = Math.min(to, toDay(member.frozenTo))
      frozenDays = Math.max(0, frozenTo - frozenFrom + 1)
    }
    const days = Math.max(MIN_PERIOD_DAYS, to - from + 1 - frozenDays)
    const visits = (visitDays.get(member.id) ?? []).filter(
      (day) => day >= from && day <= to,
    ).length
    rates.set(member.id, (visits / days) * DAYS_PER_MONTH)
  }
  return rates
}
