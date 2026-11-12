import type { CheckIn, Member } from '../data/types.ts'
import { ATTRIBUTES } from './attributes.ts'
import { STATUSES, getStatuses, isRetained } from './status.ts'
import type { MemberStatus } from './status.ts'

export const NOT_GIVEN = 'Not given'

type StatusCounts = Record<MemberStatus, number>

export interface GroupResult {
  label: string
  total: number
  retained: number
  /** Share of the group that is retained, 0 to 1. */
  rate: number
  statusCounts: StatusCounts
}

export interface AttributeBreakdown {
  id: string
  label: string
  groups: GroupResult[]
}

export interface RetentionSummary {
  asOf: string
  total: number
  retained: number
  rate: number
  statusCounts: StatusCounts
  /** Retention by group for each member attribute, in a fixed order. */
  attributes: AttributeBreakdown[]
}

const emptyCounts = (): StatusCounts => ({
  active: 0,
  frozen: 0,
  at_risk: 0,
  churned: 0,
})

/** Turns status counts into totals and a retention rate. */
function tally(statusCounts: StatusCounts) {
  let total = 0
  let retained = 0
  for (const status of STATUSES) {
    total += statusCounts[status]
    if (isRetained(status)) retained += statusCounts[status]
  }
  return { total, retained, rate: retained / total, statusCounts }
}

/**
 * Counts retention across every member attribute. Day-pass visitors are
 * left out because they never held a membership to retain.
 */
export function analyseRetention(
  allMembers: Member[],
  checkIns: CheckIn[],
): RetentionSummary {
  const { asOf, statuses } = getStatuses(allMembers, checkIns)
  const members = allMembers.filter((m) => m.membershipType !== 'day_pass')
  const statusOf = (member: Member) => statuses.get(member.id) ?? 'active'

  const overall = emptyCounts()
  for (const member of members) overall[statusOf(member)]++

  const attributes = ATTRIBUTES.map((attribute): AttributeBreakdown => {
    const byGroup = new Map<string, StatusCounts>()
    for (const member of members) {
      const group = attribute.groupOf(member, asOf) ?? NOT_GIVEN
      const counts = byGroup.get(group) ?? emptyCounts()
      counts[statusOf(member)]++
      byGroup.set(group, counts)
    }
    // Declared order (or alphabetical), with 'Not given' always last.
    const order = attribute.groups ?? [...byGroup.keys()].sort()
    const groups = [...order.filter((label) => label !== NOT_GIVEN), NOT_GIVEN]
      .filter((label) => byGroup.has(label))
      .map((label): GroupResult => ({
        label,
        ...tally(byGroup.get(label) ?? emptyCounts()),
      }))
    return { id: attribute.id, label: attribute.label, groups }
  })

  return { asOf, ...tally(overall), attributes }
}
