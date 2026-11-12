/** Bouldering grades on the V scale. */
export const BOULDER_GRADES = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10',
] as const

/** Rope grades on the Yosemite Decimal System, without letter suffixes. */
export const ROPE_GRADES = [
  '5.6', '5.7', '5.8', '5.9', '5.10', '5.11', '5.12', '5.13',
] as const

export type Grade =
  | (typeof BOULDER_GRADES)[number]
  | (typeof ROPE_GRADES)[number]

export const DISCIPLINES = ['boulder', 'top_rope', 'lead'] as const
export type Discipline = (typeof DISCIPLINES)[number]

export const MEMBERSHIP_TYPES = [
  'monthly', 'annual', 'punch_pass', 'day_pass',
] as const
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number]

export const EXPERIENCE_LEVELS = [
  'first_timer', 'under_1_year', '1_to_3_years', 'over_3_years',
] as const
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]

export const GENDERS = ['woman', 'man', 'non_binary'] as const
export type Gender = (typeof GENDERS)[number]

export const GOALS = ['fitness', 'social', 'training', 'competition'] as const
export type Goal = (typeof GOALS)[number]

export const CANCELLATION_REASONS = [
  'moved', 'cost', 'injury', 'too_busy', 'not_enough_new_routes',
  'too_crowded', 'other',
] as const
export type CancellationReason = (typeof CANCELLATION_REASONS)[number]

export const ACQUISITION_SOURCES = [
  'friend_referral', 'walk_in', 'social_media', 'web_search', 'event',
] as const
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number]

/** A membership the person held and ended before their current one. */
export interface PreviousMembership {
  membershipType: MembershipType
  startDate: string
  endDate: string
}

/**
 * Dates are 'YYYY-MM-DD' strings; timestamps are ISO 8601 in UTC.
 * Fields typed `| null` are optional and null when not provided.
 */
export interface Member {
  id: string
  name: string
  /** Collected at sign-up. Age is derived from this. */
  dateOfBirth: string

  membershipType: MembershipType
  membershipStartDate: string
  /** Start and end of a membership freeze, if there was one. */
  frozenFrom: string | null
  frozenTo: string | null
  /** Date the member asked to cancel. */
  cancelledAt: string | null
  /** Date access ends after cancelling; can be in the future. */
  membershipEndDate: string | null
  cancellationReason: CancellationReason | null
  /** Earlier memberships, oldest first. Empty for first-time members. */
  previousMemberships: PreviousMembership[]

  /**
   * Price in Canadian dollars: per month for monthly, per year for
   * annual, per 10-visit pass for punch_pass and per visit for day_pass.
   */
  price: number
  /** Payments that have failed on the current membership. */
  failedPaymentCount: number

  /** How they joined. The source is asked at sign-up and optional. */
  acquisitionSource: AcquisitionSource | null
  /** Day-pass visits made before taking out a membership. */
  dayPassVisitsBeforeJoining: number

  /** Onboarding steps completed. */
  tookIntroClass: boolean
  /** Required on a first visit, so true for everyone. */
  hadOrientation: boolean
  /** Date the belay test was passed; null if not passed. */
  belayTestPassedOn: string | null

  /** Gear owned, as opposed to rented at the desk. */
  ownsShoes: boolean
  ownsHarness: boolean

  /** Self-reported at sign-up; all optional. */
  experienceLevel: ExperienceLevel | null
  preferredDiscipline: Discipline | null
  /** Hardest grade the member can currently climb. */
  maxGrade: Grade | null
  /** Grade the member says they are projecting. */
  projectGrade: Grade | null
  heightCm: number | null
  gender: Gender | null
  mainGoal: Goal | null
  /**
   * First three characters of the home postal code (the forward sortation
   * area), such as 'M4M'.
   */
  postalArea: string | null
}

export interface CheckIn {
  id: string
  memberId: string
  /** Timestamp of the clock-in. */
  checkedInAt: string
}
