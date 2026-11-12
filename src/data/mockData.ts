import {
  ACQUISITION_SOURCES,
  BOULDER_GRADES,
  CANCELLATION_REASONS,
  DISCIPLINES,
  DISCOUNT_TYPES,
  EXPERIENCE_LEVELS,
  GENDERS,
  GOALS,
  INTRO_OFFERS,
  MEMBERSHIP_TYPES,
  ROPE_GRADES,
} from './types.ts'
import type {
  CheckIn,
  Discipline,
  Grade,
  Member,
  MembershipType,
  PreviousMembership,
} from './types.ts'

/**
 * Fake members and check-ins for building the UI before real
 * data exists. Generated from a fixed seed and a fixed date range, so every
 * run produces the same data. Change SEED or MEMBER_COUNT for a different set.
 *
 * Check-ins cover three months. Memberships can start earlier.
 */

const SEED = 42
const MEMBER_COUNT = 60
const DAY_MS = 24 * 60 * 60 * 1000
/** Three months of activity: 11 Aug 2026 to 10 Nov 2026 inclusive. */
const END = Date.UTC(2026, 10, 10)
const START = Date.UTC(2026, 7, 11)

const FIRST_NAMES = [
  'Alex', 'Sam', 'Jordan', 'Priya', 'Mateo', 'Hana', 'Noah', 'Lena', 'Omar',
  'Mei', 'Theo', 'Ines', 'Kai', 'Zoe', 'Ravi', 'Elsa', 'Diego', 'Nora',
  'Jun', 'Amara',
]
const LAST_NAMES = [
  'Nguyen', 'Garcia', 'Kim', 'Patel', 'Okafor', 'Larsen', 'Rossi', 'Tanaka',
  'Novak', 'Silva', 'Cohen', 'Dubois', 'Haddad', 'Lindgren', 'Moreno',
  'Fischer', 'Yamada', 'Reyes', 'Kowalski', 'Bennett',
]
/** Placeholder postcodes, nearest to the gym first. */
const POSTCODES = ['10001', '10002', '10003', '10004', '10005', '10006']
const POSTCODE_WEIGHTS = [10, 8, 6, 4, 2, 1]

/** Weights line up with the arrays in types.ts. */
const SOURCE_WEIGHTS = [35, 20, 18, 12, 8, 7]
const OFFER_WEIGHTS = [50, 20, 20, 10]
const DISCOUNT_WEIGHTS = [65, 15, 10, 10]
const DISCIPLINE_WEIGHTS = [55, 25, 20]
const MEMBERSHIP_WEIGHTS = [55, 20, 15, 10]
const EXPERIENCE_WEIGHTS = [25, 25, 30, 20]
const GENDER_WEIGHTS = [45, 50, 5]
const GOAL_WEIGHTS = [40, 30, 22, 8]
const REASON_WEIGHTS = [15, 20, 12, 20, 18, 8, 7]
/** Full price in US dollars for one billing period of each membership. */
const BASE_PRICES: Record<MembershipType, number> = {
  monthly: 85,
  annual: 850,
  punch_pass: 180,
  day_pass: 25,
}
const DISCOUNT_RATES = { none: 0, student: 0.2, corporate: 0.15, family: 0.1 }

/** Relative likelihood of a check-in at each hour from 06:00 to 21:00. */
const HOUR_WEIGHTS = [2, 3, 2, 1, 1, 2, 4, 3, 2, 2, 3, 6, 10, 10, 7, 3]
const HOUR_OFFSETS = HOUR_WEIGHTS.map((_, i) => i)
const FIRST_HOUR = 6

/** Small seeded random number generator (mulberry32). Returns 0 to 1. */
function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generate() {
  const random = createRandom(SEED)

  const int = (min: number, max: number) =>
    min + Math.floor(random() * (max - min + 1))
  const pick = <T,>(items: readonly T[], weights?: number[]): T => {
    if (!weights) return items[Math.floor(random() * items.length)]
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0)
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i]
      if (roll < 0) return items[i]
    }
    return items[items.length - 1]
  }
  /** Returns the value some of the time and null otherwise. */
  const maybe = <T,>(chance: number, value: () => T): T | null =>
    random() < chance ? value() : null
  const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  const gradesFor = (discipline: Discipline | null): readonly Grade[] =>
    discipline === 'top_rope' || discipline === 'lead'
      ? ROPE_GRADES
      : BOULDER_GRADES

  const members: Member[] = []
  const checkIns: Omit<CheckIn, 'id'>[] = []

  for (let i = 0; i < MEMBER_COUNT; i++) {
    const id = `m${String(i + 1).padStart(3, '0')}`
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`

    // Ages run from 16 to 55, skewed young.
    const age = 16 + Math.floor(random() ** 1.6 * 40)
    const dateOfBirth = toDate(
      END - Math.floor(age * 365.25) * DAY_MS - int(0, 364) * DAY_MS,
    )

    const membershipType = pick(MEMBERSHIP_TYPES, MEMBERSHIP_WEIGHTS)
    const hasContract =
      membershipType === 'monthly' || membershipType === 'annual'

    // Day-pass visitors and about 30% of the rest joined inside the window;
    // everyone else joined up to two years before it.
    const joinedInWindow = membershipType === 'day_pass' || random() < 0.3
    const startDay = joinedInWindow
      ? START + int(0, 77) * DAY_MS
      : START - int(1, 730) * DAY_MS
    const activeFrom = Math.max(startDay, START)
    const daysLeft = Math.round((END - activeFrom) / DAY_MS)

    // Self-reported profile. Experience drives how hard they climb.
    const experienceIndex = int(0, 3)
    const experienceLevel = maybe(0.85, () =>
      pick(EXPERIENCE_LEVELS, EXPERIENCE_WEIGHTS),
    )
    const skillIndex = experienceLevel
      ? EXPERIENCE_LEVELS.indexOf(experienceLevel)
      : experienceIndex
    const preferredDiscipline = maybe(0.85, () =>
      pick(DISCIPLINES, DISCIPLINE_WEIGHTS),
    )
    const grades = gradesFor(preferredDiscipline)
    const top = grades.length - 1
    const maxIndex = Math.floor(
      Math.min(1, (skillIndex + random() * 2) / 5) * top,
    )
    const projectIndex = Math.min(top, maxIndex + int(1, 2))
    const maxGrade = maybe(0.65, () => grades[maxIndex])
    const projectGrade = maybe(0.7, () => grades[projectIndex])
    const heightCm = maybe(0.6, () =>
      Math.round(150 + (random() + random() + random()) * 15),
    )
    const gender = maybe(0.75, () => pick(GENDERS, GENDER_WEIGHTS))
    const mainGoal = maybe(0.7, () => pick(GOALS, GOAL_WEIGHTS))
    const postcode = maybe(0.8, () => pick(POSTCODES, POSTCODE_WEIGHTS))

    // How they joined. Day-pass visitors get no offers or discounts.
    const isDayPass = membershipType === 'day_pass'
    const acquisitionSource = maybe(0.8, () =>
      pick(ACQUISITION_SOURCES, SOURCE_WEIGHTS),
    )
    const introOffer = isDayPass ? 'none' : pick(INTRO_OFFERS, OFFER_WEIGHTS)
    const dayPassVisitsBeforeJoining =
      !isDayPass && random() < 0.45 ? int(1, 5) : 0

    // Onboarding. New climbers mostly take the intro class, and rope
    // climbers nearly all pass a belay test within three weeks of joining.
    const climbsRopes =
      preferredDiscipline === 'top_rope' || preferredDiscipline === 'lead'
    const tookIntroClass = random() < (skillIndex === 0 ? 0.7 : 0.15)
    const hadOrientation = random() < 0.6
    const belayTestPassedOn =
      random() < (climbsRopes ? 0.9 : 0.2)
        ? toDate(Math.min(END, startDay + int(0, 21) * DAY_MS))
        : null

    // Price and billing. Only contracts can have failed payments.
    const discountType = isDayPass ? 'none' : pick(DISCOUNT_TYPES, DISCOUNT_WEIGHTS)
    const price = Math.round(
      BASE_PRICES[membershipType] * (1 - DISCOUNT_RATES[discountType]),
    )
    const failedPaymentCount = hasContract && random() < 0.2 ? int(1, 3) : 0

    // Gear. More experienced climbers are more likely to own their own.
    const ownsShoes = random() < 0.25 + skillIndex * 0.22
    const ownsHarness =
      random() < (climbsRopes ? 0.2 + skillIndex * 0.22 : 0.05 + skillIndex * 0.05)

    // Membership history. About one in six has been a member before.
    const previousMemberships: PreviousMembership[] = []
    if (!isDayPass && random() < 0.18) {
      let nextStart = startDay
      for (let count = random() < 0.2 ? 2 : 1; count > 0; count--) {
        const end = nextStart - int(30, 400) * DAY_MS
        nextStart = end - int(60, 500) * DAY_MS
        previousMemberships.unshift({
          membershipType: random() < 0.75 ? 'monthly' : 'punch_pass',
          startDate: toDate(nextStart),
          endDate: toDate(end),
        })
      }
    }

    // Visit habit depends on the kind of membership.
    const visitsPerWeek = hasContract
      ? 0.5 + random() * random() * 3.5
      : membershipType === 'punch_pass'
        ? 0.3 + random()
        : 0.15 + random() * 0.2

    // What happens to the member during the window.
    let lastVisitDay = END
    let frozenFrom: number | null = null
    let frozenTo: number | null = null
    let cancelledAt: number | null = null
    let membershipEndDate: number | null = null
    let cancellationReason: Member['cancellationReason'] = null

    const fate = random()
    if (hasContract) {
      const cancelChance = membershipType === 'monthly' ? 0.22 : 0.05
      if (fate < cancelChance) {
        // Cancels: visits tail off up to two weeks before the request.
        cancelledAt = activeFrom + int(7, Math.max(7, daysLeft)) * DAY_MS
        membershipEndDate = cancelledAt + int(0, 30) * DAY_MS
        cancellationReason = pick(CANCELLATION_REASONS, REASON_WEIGHTS)
        lastVisitDay = cancelledAt - int(0, 14) * DAY_MS
      } else if (fate < cancelChance + 0.08) {
        // Freezes for two to six weeks.
        frozenFrom = activeFrom + int(0, Math.max(0, daysLeft - 14)) * DAY_MS
        frozenTo = frozenFrom + int(14, 42) * DAY_MS
      } else if (fate < cancelChance + 0.18) {
        // Still paying but has stopped coming.
        lastVisitDay = activeFrom + int(0, daysLeft) * DAY_MS
      }
    } else if (fate < 0.3) {
      // Pass holders who drift away.
      lastVisitDay = activeFrom + int(0, daysLeft) * DAY_MS
    }

    for (
      let day = activeFrom;
      day <= Math.min(lastVisitDay, END);
      day += DAY_MS
    ) {
      if (frozenFrom !== null && frozenTo !== null) {
        if (day >= frozenFrom && day <= frozenTo) continue
      }
      const chance = visitsPerWeek / 7
      // New joiners always check in on the day they join.
      if (day !== startDay && random() >= chance) continue
      const hour = FIRST_HOUR + pick(HOUR_OFFSETS, HOUR_WEIGHTS)
      const seconds = (hour * 60 + int(0, 59)) * 60 + int(0, 59)
      checkIns.push({
        memberId: id,
        checkedInAt: new Date(day + seconds * 1000).toISOString(),
      })
    }

    const dateOrNull = (ms: number | null) => (ms === null ? null : toDate(ms))
    members.push({
      id,
      name,
      dateOfBirth,
      membershipType,
      membershipStartDate: toDate(startDay),
      frozenFrom: dateOrNull(frozenFrom),
      frozenTo: dateOrNull(frozenTo),
      cancelledAt: dateOrNull(cancelledAt),
      membershipEndDate: dateOrNull(membershipEndDate),
      cancellationReason,
      previousMemberships,
      price,
      discountType,
      failedPaymentCount,
      acquisitionSource,
      introOffer,
      dayPassVisitsBeforeJoining,
      tookIntroClass,
      hadOrientation,
      belayTestPassedOn,
      ownsShoes,
      ownsHarness,
      experienceLevel,
      preferredDiscipline,
      maxGrade,
      projectGrade,
      heightCm,
      gender,
      mainGoal,
      postcode,
    })
  }

  checkIns.sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt))

  return {
    members,
    checkIns: checkIns.map(
      (checkIn, i): CheckIn => ({
        id: `c${String(i + 1).padStart(5, '0')}`,
        ...checkIn,
      }),
    ),
  }
}

export const { members, checkIns } = generate()
