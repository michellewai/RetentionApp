import {
  ACQUISITION_SOURCES,
  BOULDER_GRADES,
  CANCELLATION_REASONS,
  DISCIPLINES,
  EXPERIENCE_LEVELS,
  GENDERS,
  GOALS,
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
 *
 * The numbers are calibrated to published figures where they exist; the
 * README lists each source and which values are assumptions.
 */

const SEED = 42
const MEMBER_COUNT = 600
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
/**
 * Real Greater Toronto Area postal areas, nearest first to a gym in
 * downtown Toronto (M5V): the downtown core, then the west and east ends,
 * North York and Mississauga.
 */
const POSTAL_AREAS = ['M5V', 'M5T', 'M5A', 'M6J', 'M6K', 'M4M', 'M2N', 'L5B']
const POSTAL_AREA_WEIGHTS = [10, 8, 6, 5, 4, 3, 2, 1]

/** Weights line up with the arrays in types.ts. */
const SOURCE_WEIGHTS = [35, 20, 18, 12, 8]
const DISCIPLINE_WEIGHTS = [55, 25, 20]
const MEMBERSHIP_WEIGHTS = [55, 20, 15, 10]
const EXPERIENCE_WEIGHTS = [25, 25, 30, 20]
/** Woman, man, non-binary: climbing gyms skew male. */
const GENDER_WEIGHTS = [35, 62, 3]
const GOAL_WEIGHTS = [40, 30, 22, 8]
const REASON_WEIGHTS = [15, 20, 12, 20, 18, 8, 7]
/** Price in Canadian dollars for one billing period of each membership. */
const BASE_PRICES: Record<MembershipType, number> = {
  monthly: 85,
  annual: 850,
  punch_pass: 180,
  day_pass: 25,
}

/** Most members are 20 to 30. Each band is [youngest, oldest, weight]. */
const AGE_BANDS = [
  [16, 19, 8],
  [20, 30, 60],
  [31, 40, 22],
  [41, 60, 10],
] as const

/**
 * Mean measured height in cm for Canadians aged 20 to 39 (Statistics
 * Canada, Canadian Health Measures Survey 2007 to 2009). The spread is an
 * assumption; the survey tables do not publish one.
 */
const HEIGHT_CM = {
  man: { mean: 176.6, spread: 7 },
  woman: { mean: 163.8, spread: 6.5 },
}

/**
 * Chance per month that a monthly member cancels, by how often they visit.
 * Griptonite's case study found members under three visits a month had a
 * 61% chance of cancelling; here that is read as 61% within a year, which
 * is 7.5% a month. The two higher bands are assumptions.
 */
const MONTHLY_CANCEL_CHANCE = { low: 0.075, medium: 0.03, high: 0.012 }
/** Visits a month that separate the low, medium and high bands. */
const LOW_VISITS_PER_MONTH = 3
const HIGH_VISITS_PER_MONTH = 8
const WEEKS_PER_MONTH = 52 / 12
/** New members cancel more: about half of gym memberships end within six
 * months (fitness industry figure). Both multipliers are assumptions. */
const NEW_MEMBER_MONTHS = 6
const NEW_MEMBER_RISK = 2
const ESTABLISHED_MEMBER_RISK = 0.7
/** Annual members are locked in for the year. An assumption. */
const ANNUAL_CONTRACT_RISK = 0.3
/** Share of first-time day-pass visitors who never return (Griptonite). */
const NEVER_RETURN_CHANCE = 0.66
/** A visitor who does return is twice as likely to come again (Griptonite). */
const RETURN_AGAIN_CHANCE = 0.68

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
  /** A bell-curve value around a mean (Box-Muller transform). */
  const normal = (mean: number, spread: number) =>
    mean +
    spread *
      Math.sqrt(-2 * Math.log(1 - random())) *
      Math.cos(2 * Math.PI * random())
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

    const ageBand = pick(AGE_BANDS, AGE_BANDS.map((band) => band[2]))
    const age = int(ageBand[0], ageBand[1])
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
    const gender = maybe(0.75, () => pick(GENDERS, GENDER_WEIGHTS))
    // Height follows the member's gender. Anyone who did not say, or is
    // non-binary, is drawn from one of the two published distributions.
    const heightKey =
      gender === 'man' || gender === 'woman'
        ? gender
        : pick(['woman', 'man'] as const, GENDER_WEIGHTS.slice(0, 2))
    const heightCm = maybe(0.6, () =>
      Math.round(normal(HEIGHT_CM[heightKey].mean, HEIGHT_CM[heightKey].spread)),
    )
    const mainGoal = maybe(0.7, () => pick(GOALS, GOAL_WEIGHTS))
    const postalArea = maybe(0.8, () => pick(POSTAL_AREAS, POSTAL_AREA_WEIGHTS))

    // How they joined.
    const isDayPass = membershipType === 'day_pass'
    const acquisitionSource = maybe(0.8, () =>
      pick(ACQUISITION_SOURCES, SOURCE_WEIGHTS),
    )
    const dayPassVisitsBeforeJoining =
      !isDayPass && random() < 0.45 ? int(1, 5) : 0

    // Onboarding. New climbers mostly take the intro class, and rope
    // climbers nearly all pass a belay test within three weeks of joining.
    const climbsRopes =
      preferredDiscipline === 'top_rope' || preferredDiscipline === 'lead'
    const tookIntroClass = random() < (skillIndex === 0 ? 0.7 : 0.15)
    // Orientation is required on a first visit, so everyone has had it.
    const hadOrientation = true
    const belayTestPassedOn =
      random() < (climbsRopes ? 0.9 : 0.2)
        ? toDate(Math.min(END, startDay + int(0, 21) * DAY_MS))
        : null

    // Price and billing. Only contracts can have failed payments.
    const price = BASE_PRICES[membershipType]
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

    // Visit habit. Members average about 5.2 visits a month (Griptonite),
    // with most below that and a few far above.
    const visitsPerWeek = hasContract
      ? 0.3 + random() * random() * 3.6
      : 0.3 + random()
    const visitsPerMonth = visitsPerWeek * WEEKS_PER_MONTH

    // What happens to the member during the window.
    let lastVisitDay = END
    let frozenFrom: number | null = null
    let frozenTo: number | null = null
    let cancelledAt: number | null = null
    let membershipEndDate: number | null = null
    let cancellationReason: Member['cancellationReason'] = null

    if (hasContract) {
      // The chance of cancelling depends on how often they visit, how new
      // they are and their contract. Age, gender and ability play no part:
      // Griptonite found churn roughly equal across those groups.
      const band =
        visitsPerMonth < LOW_VISITS_PER_MONTH
          ? 'low'
          : visitsPerMonth > HIGH_VISITS_PER_MONTH
            ? 'high'
            : 'medium'
      const monthsAsMember = (activeFrom - startDay) / DAY_MS / 30.4
      const monthlyChance =
        MONTHLY_CANCEL_CHANCE[band] *
        (monthsAsMember < NEW_MEMBER_MONTHS
          ? NEW_MEMBER_RISK
          : ESTABLISHED_MEMBER_RISK) *
        (membershipType === 'annual' ? ANNUAL_CONTRACT_RISK : 1)
      // Days until they cancel, drawn so each month carries that chance.
      const daysUntilCancel = Math.max(
        7,
        Math.round((Math.log(1 - random()) / Math.log(1 - monthlyChance)) * 30.4),
      )
      if (daysUntilCancel <= daysLeft) {
        // Cancels: visits tail off up to two weeks before the request.
        cancelledAt = activeFrom + daysUntilCancel * DAY_MS
        membershipEndDate = cancelledAt + int(0, 30) * DAY_MS
        cancellationReason = pick(CANCELLATION_REASONS, REASON_WEIGHTS)
        lastVisitDay = cancelledAt - int(0, 14) * DAY_MS
      } else if (random() < 0.05) {
        // Freezes for two to six weeks.
        frozenFrom = activeFrom + int(0, Math.max(0, daysLeft - 14)) * DAY_MS
        frozenTo = frozenFrom + int(14, 42) * DAY_MS
      }
    } else if (membershipType === 'punch_pass' && random() < 0.3) {
      // Punch-pass holders who drift away without using every visit.
      lastVisitDay = activeFrom + int(0, daysLeft) * DAY_MS
    }

    const addCheckIn = (day: number) => {
      const hour = FIRST_HOUR + pick(HOUR_OFFSETS, HOUR_WEIGHTS)
      const seconds = (hour * 60 + int(0, 59)) * 60 + int(0, 59)
      checkIns.push({
        memberId: id,
        checkedInAt: new Date(day + seconds * 1000).toISOString(),
      })
    }

    if (isDayPass) {
      // Day-pass visitors come once; most never return, and each return
      // makes another more likely.
      addCheckIn(startDay)
      let day = startDay + int(3, 21) * DAY_MS
      let returns = random() >= NEVER_RETURN_CHANCE
      while (returns && day <= END) {
        addCheckIn(day)
        day += int(3, 21) * DAY_MS
        returns = random() < RETURN_AGAIN_CHANCE
      }
    } else {
      for (
        let day = activeFrom;
        day <= Math.min(lastVisitDay, END);
        day += DAY_MS
      ) {
        if (frozenFrom !== null && frozenTo !== null) {
          if (day >= frozenFrom && day <= frozenTo) continue
        }
        // New joiners always check in on the day they join.
        if (day === startDay || random() < visitsPerWeek / 7) addCheckIn(day)
      }
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
      failedPaymentCount,
      acquisitionSource,
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
      postalArea,
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
