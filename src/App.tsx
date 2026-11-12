import './App.css'
import { RetentionView } from './components/RetentionView.tsx'
import { checkIns, members } from './data/mockData.ts'
import { analyseRetention } from './retention/analyse.ts'

const retention = analyseRetention(members, checkIns)

function App() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>User Dashboard</h1>
        <p>Fake data, 11 Aug to 10 Nov 2026</p>
      </header>
      <RetentionView summary={retention} />
    </main>
  )
}

export default App
