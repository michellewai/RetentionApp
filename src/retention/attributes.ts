import {
  ACQUISITION_SOURCES,
  BOULDER_GRADES,
  DISCIPLINES,
  EXPERIENCE_LEVELS,
  GENDERS,
  GOALS,
  ROPE_GRADES,
} from '../data/types.ts'
import type { Grade, Member } from '../data/types.ts'
import { formatLabel } from '../lib/format.ts'

/** A member attribute that retention is broken down by. */
export interface Attribute {
  id: string
  label: string
  /** Group names in display order; omit to sort them alphabetically. */
  groups?: string[]
  /**
   * The group a member belongs to, or null if they did not say.
   * visitsPerMonth is the member's average check-ins a month.
   */
  groupOf: (
    member: Member,
    asOf: string,
    visitsPerMonth: number,
  ) => string | null
}

/** An attribute with a Yes group and a No group. */
function yesNo(
  id: string,
  label: string,
  test: (member: Member) => boolean,
): Attribute {
  return {
    id,
    label,
    groups: ['Yes', 'No'],
    groupOf: (member) => (test(member) ? 'Yes' : 'No'),
  }
}

/** An attribute whose groups are the stored values, such as 'top_rope'. */
function choice(
  id: string,
  label: string,
  values: readonly string[],
  get: (member: Member) => string | null,
): Attribute {
  return {
    id,
    label,
    groups: values.map((value) => formatLabel(value) ?? value),
    groupOf: (member) => formatLabel(get(member)),
  }
}

/** An attribute that splits members into None and 1 or more. */
function anyOrNone(
  id: string,
  label: string,
  count: (member: Member) => number,
): Attribute {
  return {
    id,
    label,
    groups: ['None', '1 or more'],
    groupOf: (member) => (count(member) > 0 ? '1 or more' : 'None'),
  }
}

const MS_PER_MONTH = 30.4 * 24 * 60 * 60 * 1000

function ageOn(dateOfBirth: string, asOf: string) {
  const years = Number(asOf.slice(0, 4)) - Number(dateOfBirth.slice(0, 4))
  return asOf.slice(5) >= dateOfBirth.slice(5) ? years : years - 1
}

function ageBand(age: number) {
  if (age < 25) return 'Under 25'
  if (age < 35) return '25 to 34'
  return age < 45 ? '35 to 44' : '45 and over'
}

/** How long someone has been, or was, a member, in bands. */
function tenureBand(member: Member, asOf: string) {
  const end = Date.parse(member.cancelledAt ?? asOf)
  const months = (end - Date.parse(member.membershipStartDate)) / MS_PER_MONTH
  if (months < 6) return 'Under 6 months'
  if (months < 12) return '6 to 12 months'
  return months < 24 ? '1 to 2 years' : 'Over 2 years'
}

function visitBand(visitsPerMonth: number) {
  if (visitsPerMonth < 3) return 'Under 3 a month'
  return visitsPerMonth <= 8 ? '3 to 8 a month' : 'Over 8 a month'
}

function heightBand(heightCm: number | null) {
  if (heightCm === null) return null
  if (heightCm < 165) return 'Under 165 cm'
  return heightCm < 175 ? '165 to 174 cm' : '175 cm and over'
}

/** Puts boulder and rope grades on one three-step scale. */
function gradeBand(grade: Grade | null) {
  if (!grade) return null
  const boulder = (BOULDER_GRADES as readonly string[]).indexOf(grade)
  const rope = (ROPE_GRADES as readonly string[]).indexOf(grade)
  if (boulder >= 0) return boulder <= 2 ? 'Lower' : boulder <= 5 ? 'Middle' : 'Upper'
  return rope <= 2 ? 'Lower' : rope <= 4 ? 'Middle' : 'Upper'
}

/** Every attribute shown on the page, in display order. */
export const ATTRIBUTES: Attribute[] = [
  {
    id: 'membershipType',
    label: 'Membership type',
    groups: ['Monthly', 'Annual', 'Punch pass'],
    groupOf: (m) => formatLabel(m.membershipType),
  },
  {
    id: 'visits',
    label: 'Visits',
    groups: ['Under 3 a month', '3 to 8 a month', 'Over 8 a month'],
    groupOf: (_member, _asOf, visitsPerMonth) => visitBand(visitsPerMonth),
  },
  {
    id: 'tenure',
    label: 'Time as a member',
    groups: ['Under 6 months', '6 to 12 months', '1 to 2 years', 'Over 2 years'],
    groupOf: (m, asOf) => tenureBand(m, asOf),
  },
  choice('experienceLevel', 'Experience at sign-up', EXPERIENCE_LEVELS, (m) => m.experienceLevel),
  yesNo('tookIntroClass', 'Took intro class', (m) => m.tookIntroClass),
  yesNo('belayTest', 'Passed belay test', (m) => m.belayTestPassedOn !== null),
  yesNo('ownsShoes', 'Owns shoes', (m) => m.ownsShoes),
  yesNo('ownsHarness', 'Owns harness', (m) => m.ownsHarness),
  choice('acquisitionSource', 'How they found the gym', ACQUISITION_SOURCES, (m) => m.acquisitionSource),
  anyOrNone('dayPasses', 'Day passes before joining', (m) => m.dayPassVisitsBeforeJoining),
  anyOrNone('failedPayments', 'Failed payments', (m) => m.failedPaymentCount),
  yesNo('history', 'Been a member before', (m) => m.previousMemberships.length > 0),
  choice('preferredDiscipline', 'Preferred discipline', DISCIPLINES, (m) => m.preferredDiscipline),
  {
    id: 'projectGrade',
    label: 'Project grade',
    groups: ['Lower', 'Middle', 'Upper'],
    groupOf: (m) => gradeBand(m.projectGrade),
  },
  {
    id: 'age',
    label: 'Age',
    groups: ['Under 25', '25 to 34', '35 to 44', '45 and over'],
    groupOf: (m, asOf) => ageBand(ageOn(m.dateOfBirth, asOf)),
  },
  {
    id: 'height',
    label: 'Height',
    groups: ['Under 165 cm', '165 to 174 cm', '175 cm and over'],
    groupOf: (m) => heightBand(m.heightCm),
  },
  choice('gender', 'Gender', GENDERS, (m) => m.gender),
  choice('mainGoal', 'Main goal', GOALS, (m) => m.mainGoal),
  { id: 'postalArea', label: 'Postal area', groupOf: (m) => m.postalArea },
]
