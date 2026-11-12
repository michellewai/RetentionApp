import { useMemo } from 'react'
import './App.css'
import { RetentionView } from './components/RetentionView.tsx'
import type { DataSource } from './config.ts'
import type { GymData } from './data/loadGymData.ts'
import { useGymData } from './data/useGymData.ts'
import { analyseRetention } from './retention/analyse.ts'

const SOURCE_LABELS: Record<DataSource, string> = {
  code: 'code',
  supabase: 'Supabase',
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** The period the check-ins cover, such as '11 Aug 2026 to 10 Nov 2026'. */
function describePeriod({ checkIns }: GymData) {
  const first = checkIns[0]
  const last = checkIns[checkIns.length - 1]
  if (!first || !last) return null
  const format = (timestamp: string) => dateFormat.format(new Date(timestamp))
  return `${format(first.checkedInAt)} to ${format(last.checkedInAt)}`
}

function Dashboard({ data }: { data: GymData }) {
  const retention = useMemo(
    () => analyseRetention(data.members, data.checkIns),
    [data],
  )
  if (retention.total === 0) {
    return (
      <p className="page-message">
        The database has no members yet. Load the seed data, then reload this
        page.
      </p>
    )
  }
  return <RetentionView summary={retention} />
}

function App() {
  const state = useGymData()
  const period = state.status === 'ready' ? describePeriod(state.data) : null
  const source =
    state.status === 'ready' ? ` from ${SOURCE_LABELS[state.source]}` : ''

  return (
    <main className="page">
      <header className="page-header">
        <h1>User Dashboard</h1>
        <p>
          Fake data{source}
          {period ? `, ${period}` : ''}
        </p>
      </header>
      {state.status === 'loading' && (
        <p className="page-message" role="status">
          Loading member data…
        </p>
      )}
      {state.status === 'error' && (
        <div className="page-message page-error" role="alert">
          <p>The member data could not be loaded.</p>
          <p>{state.message}</p>
        </div>
      )}
      {state.status === 'ready' && <Dashboard data={state.data} />}
    </main>
  )
}

export default App
