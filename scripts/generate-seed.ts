// Writes supabase/seed.sql from the fake data generator.
// Run with: npm run seed:generate

import { writeFileSync } from 'node:fs'
import { checkIns, members } from '../src/data/mockData.ts'
import { buildSeedSql } from '../src/data/seedSql.ts'

const path = new URL('../supabase/seed.sql', import.meta.url)
const sql = buildSeedSql(members, checkIns)
writeFileSync(path, sql)

console.log(
  `Wrote ${members.length} members and ${checkIns.length} check-ins ` +
    `to supabase/seed.sql (${Math.round(sql.length / 1024)} KB).`,
)
