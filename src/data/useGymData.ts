import { useEffect, useState } from 'react'
import { getDataSource } from '../config.ts'
import type { DataSource } from '../config.ts'
import type { GymData } from './loadGymData.ts'

export type GymDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: GymData; source: DataSource }

/**
 * Loads members and check-ins from the source chosen by VITE_DATA_SOURCE.
 * Each source is imported only when it is used, so the page never needs
 * Supabase keys to show the data in code, and a missing key shows as an
 * error on the page instead of a blank screen.
 */
async function loadFrom(source: DataSource): Promise<GymData> {
  if (source === 'supabase') {
    const [{ supabase }, { loadGymData }] = await Promise.all([
      import('../lib/supabase.ts'),
      import('./loadGymData.ts'),
    ])
    return loadGymData(supabase)
  }
  const { members, checkIns } = await import('./mockData.ts')
  return { members, checkIns }
}

/** Loads the gym's data once, when the page opens. */
export function useGymData(): GymDataState {
  const [state, setState] = useState<GymDataState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    // Reading the setting can throw on an unknown value, so it happens
    // inside the promise chain where the error reaches the page.
    Promise.resolve()
      .then(async () => {
        const source = getDataSource()
        return { source, data: await loadFrom(source) }
      })
      .then(({ source, data }) => {
        if (!cancelled) setState({ status: 'ready', data, source })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        setState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
