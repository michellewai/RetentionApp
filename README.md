# RetentionApp

Responsive web app for climbing gym owners to track retention.

Built with React, TypeScript, Vite and Supabase.

## Setup

Requires Node 22.13 or newer.

```bash
npm install
cp .env.example .env
```

Fill in `.env` with the project URL and publishable key from Supabase
(Project Settings > API).

## Run

```bash
npm run dev
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## Test

Tests use Vitest and cover the retention rules in `src/retention/`.

```bash
npm test
```

To rerun tests automatically as you edit:

```bash
npm run test:watch
```

Test files sit next to the code they cover and end in `.test.ts`.

## Fake data

The app runs on generated data, not real member records. It is produced
from a fixed seed in `src/data/mockData.ts` and calibrated to published
figures where they exist.

| What | Value used | Basis |
|---|---|---|
| First-time day-pass visitors who never return | 66% | Griptonite study of UK climbing gyms [1] |
| Average member visits | About 5.2 a month | Griptonite case study [2] |
| Cancelling when under 3 visits a month | 61%, read here as within a year | Griptonite case study [2]; the study gives no time frame, so one year is an assumption |
| Churn by age, gender and ability | No difference | Griptonite found it roughly equal [2] |
| Height | Men 176.6 cm, women 163.8 cm on average | Statistics Canada, ages 20 to 39 [3] |
| Gender split | 62% men, 35% women, 3% non-binary | Assumption: climbing gyms skew male |
| Age | 60% aged 20 to 30 | Assumption |
| New members (under 6 months) | Twice the cancellation risk | Assumption, after a fitness-industry figure that about half of memberships end within six months [2] |
| Annual members | 30% of the monthly cancellation risk | Assumption |
| Height spread, other visit bands | See the constants in the file | Assumption |

No Toronto-specific height data is published, so national Canadian figures
stand in. No public dataset of climbing gym memberships and check-ins
exists, which is why the data is generated.

1. [Two tips from Griptonite to decrease churn](https://climbingbusinessjournal.com/two-tips-from-griptonite-you-can-try-now-to-decrease-churn-and-increase-retention/), Climbing Business Journal, 2024
2. [Griptonite attendance and engagement case study](https://climbingbusinessjournal.com/crunching-the-numbers-griptonite-analyzes-an-attendance-and-engagement-case-study/), Climbing Business Journal, 2025
3. [Body composition of Canadian adults, 2007 to 2009](https://www150.statcan.gc.ca/n1/pub/82-625-x/2010001/article/11091-eng.htm), Statistics Canada
