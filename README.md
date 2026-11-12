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
