import type { CheckIn, Member } from '../data/types.ts'

const DAY_MS = 24 * 60 * 60 * 1000

/** No visit for this many days puts a member at risk. */
export const AT_RISK_AFTER_DAYS = 30
/** No visit for this many days counts a pass holder as churned. */
export const PASS_CHURN_AFTER_DAYS = 60

export const STATUSES = ['active', 'frozen', 'at_risk', 'churned'] as const
export type MemberStatus = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Active',
  frozen: 'Frozen',
  at_risk: 'At risk',
  churned: 'Churned',
}

/**
 * Where a member stands on a given date:
 * - churned: has cancelled, or holds a pass and has not visited in 60 days
 * - frozen: currently on a membership freeze
 * - at_risk: has not visited in 30 days
 * - active: everyone else
 */
export function getMemberStatus(
  member: Member,
  lastVisitDate: string | null,
  asOf: string,
): MemberStatus {
  if (member.cancelledAt && member.cancelledAt <= asOf) return 'churned'
  if (
    member.frozenFrom &&
    member.frozenTo &&
    member.frozenFrom <= asOf &&
    asOf <= member.frozenTo
  ) {
    return 'frozen'
  }
  const daysSinceVisit = lastVisitDate
    ? Math.round((Date.parse(asOf) - Date.parse(lastVisitDate)) / DAY_MS)
    : Infinity
  const holdsPass =
    member.membershipType === 'punch_pass' ||
    member.membershipType === 'day_pass'
  if (holdsPass && daysSinceVisit > PASS_CHURN_AFTER_DAYS) return 'churned'
  if (daysSinceVisit > AT_RISK_AFTER_DAYS) return 'at_risk'
  return 'active'
}

/** Active and frozen members count as retained. */
export function isRetained(status: MemberStatus) {
  return status === 'active' || status === 'frozen'
}

/** Works out every member's status as of the latest check-in in the data. */
export function getStatuses(members: Member[], checkIns: CheckIn[]) {
  const lastVisit = new Map<string, string>()
  let asOf = ''
  for (const checkIn of checkIns) {
    const date = checkIn.checkedInAt.slice(0, 10)
    if (date > (lastVisit.get(checkIn.memberId) ?? '')) {
      lastVisit.set(checkIn.memberId, date)
    }
    if (date > asOf) asOf = date
  }
  const statuses = new Map<string, MemberStatus>()
  for (const member of members) {
    statuses.set(
      member.id,
      getMemberStatus(member, lastVisit.get(member.id) ?? null, asOf),
    )
  }
  return { asOf, statuses }
}
