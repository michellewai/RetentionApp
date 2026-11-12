import type { SupabaseClient } from '@supabase/supabase-js'
import type { CheckIn, Member } from './types.ts'

/** Rows asked for per request. Supabase returns at most 1,000 by default. */
export const PAGE_SIZE = 1000

/** A `members` row with its previous memberships, as the API returns it. */
export interface MemberRow {
  id: string
  name: string
  date_of_birth: string
  membership_type: Member['membershipType']
  membership_start_date: string
  frozen_from: string | null
  frozen_to: string | null
  cancelled_at: string | null
  membership_end_date: string | null
  cancellation_reason: Member['cancellationReason']
  price: number
  failed_payment_count: number
  acquisition_source: Member['acquisitionSource']
  day_pass_visits_before_joining: number
  took_intro_class: boolean
  had_orientation: boolean
  belay_test_passed_on: string | null
  owns_shoes: boolean
  owns_harness: boolean
  experience_level: Member['experienceLevel']
  preferred_discipline: Member['preferredDiscipline']
  max_grade: Member['maxGrade']
  project_grade: Member['projectGrade']
  height_cm: number | null
  gender: Member['gender']
  main_goal: Member['mainGoal']
  postal_area: string | null
  previous_memberships: {
    membership_type: Member['membershipType']
    start_date: string
    end_date: string
  }[]
}

export interface CheckInRow {
  id: string
  member_id: string
  checked_in_at: string
}

/** Converts a database row into the Member shape the app works with. */
export function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    dateOfBirth: row.date_of_birth,
    membershipType: row.membership_type,
    membershipStartDate: row.membership_start_date,
    frozenFrom: row.frozen_from,
    frozenTo: row.frozen_to,
    cancelledAt: row.cancelled_at,
    membershipEndDate: row.membership_end_date,
    cancellationReason: row.cancellation_reason,
    previousMemberships: row.previous_memberships
      .map((past) => ({
        membershipType: past.membership_type,
        startDate: past.start_date,
        endDate: past.end_date,
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    // Postgres numeric can arrive as text; the app expects a number.
    price: Number(row.price),
    failedPaymentCount: row.failed_payment_count,
    acquisitionSource: row.acquisition_source,
    dayPassVisitsBeforeJoining: row.day_pass_visits_before_joining,
    tookIntroClass: row.took_intro_class,
    hadOrientation: row.had_orientation,
    belayTestPassedOn: row.belay_test_passed_on,
    ownsShoes: row.owns_shoes,
    ownsHarness: row.owns_harness,
    experienceLevel: row.experience_level,
    preferredDiscipline: row.preferred_discipline,
    maxGrade: row.max_grade,
    projectGrade: row.project_grade,
    heightCm: row.height_cm,
    gender: row.gender,
    mainGoal: row.main_goal,
    postalArea: row.postal_area,
  }
}

/** Converts a database row into the CheckIn shape the app works with. */
export function toCheckIn(row: CheckInRow): CheckIn {
  return {
    id: row.id,
    memberId: row.member_id,
    // The API writes UTC as '+00:00'; the app uses the 'Z' form throughout.
    checkedInAt: new Date(row.checked_in_at).toISOString(),
  }
}

/** One page of rows, plus how many rows the whole query matches. */
export interface Page<Row> {
  rows: Row[]
  total: number
}

/**
 * Fetches every row of a query a page at a time. The first page reports
 * the total, and the remaining pages are then fetched together.
 */
export async function fetchAllPages<Row>(
  fetchPage: (from: number, to: number) => Promise<Page<Row>>,
  pageSize = PAGE_SIZE,
) {
  const first = await fetchPage(0, pageSize - 1)
  const starts: number[] = []
  for (let from = pageSize; from < first.total; from += pageSize) {
    starts.push(from)
  }
  const rest = await Promise.all(
    starts.map((from) => fetchPage(from, from + pageSize - 1)),
  )
  return [first, ...rest].flatMap((page) => page.rows)
}

/** Reads one page of a table, in id order so pages never overlap. */
async function readPage<Row>(
  client: SupabaseClient,
  table: string,
  columns: string,
  from: number,
  to: number,
): Promise<Page<Row>> {
  const { data, count, error } = await client
    .from(table)
    .select(columns, { count: 'exact' })
    .order('id')
    .range(from, to)
  if (error) {
    throw new Error(`Could not load ${table}: ${error.message}`)
  }
  return { rows: (data ?? []) as Row[], total: count ?? 0 }
}

export interface GymData {
  members: Member[]
  checkIns: CheckIn[]
}

/** Loads every member and check-in from the database. */
export async function loadGymData(client: SupabaseClient): Promise<GymData> {
  const [memberRows, checkInRows] = await Promise.all([
    fetchAllPages<MemberRow>((from, to) =>
      readPage(
        client,
        'members',
        '*, previous_memberships(membership_type, start_date, end_date)',
        from,
        to,
      ),
    ),
    fetchAllPages<CheckInRow>((from, to) =>
      readPage(client, 'check_ins', 'id, member_id, checked_in_at', from, to),
    ),
  ])
  return {
    members: memberRows.map(toMember),
    // Oldest first, as the rest of the app expects.
    checkIns: checkInRows
      .map(toCheckIn)
      .sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt)),
  }
}
