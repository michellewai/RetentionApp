# Supabase setup

Copy the example env file and fill in the project URL and publishable key
from Supabase (Project Settings > API):

```bash
cp .env.example .env
```

The schema and seed data for Supabase live in `supabase/`. Set `VITE_DATA_SOURCE=supabase` in `.env` to make the app read from it.

- `supabase/migrations/` holds the schema: the `members`,
  `previous_memberships` and `check_ins` tables and their access rules.
- `supabase/seed.sql` holds the fake data. It empties the tables first, so
  it is safe to run again.

Every table has row-level security on with one policy: anyone can read,
nobody can write through the API. That suits a public demo of generated
data. Real member records would need staff sign-in and per-gym rules.

### Apply it with the Supabase CLI

Install the CLI (macOS):

```bash
brew install supabase/tap/supabase
```

Create `supabase/config.toml`. This is needed once per clone and leaves
the existing migration and seed alone:

```bash
supabase init
```

Sign in, which opens a browser:

```bash
supabase login
```

Link this folder to the hosted project. The project ref is the first part
of the project URL, and the command asks for the database password:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Preview what would be applied:

```bash
supabase db push --dry-run --remote
```

Apply the migration and load the seed data:

```bash
supabase db push --include-seed --remote
```

These commands are for CLI version 3. Older versions push to the linked
project by default and do not accept `--remote`; `supabase db push --help`
shows what your version expects.

### Or use the SQL Editor

With no CLI, paste the migration file and then `seed.sql` into the SQL
Editor in the Supabase dashboard and run each. This does not record
migration history.

### Changing the schema or data

Add a schema change as a new file, never by editing one already applied:

```bash
supabase migration new describe_the_change
```

`seed.sql` is generated. After changing the fake data, rebuild it with:

```bash
npm run seed:generate
```
