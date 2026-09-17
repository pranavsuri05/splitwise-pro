import { useEffect, useState } from 'react'
import { getHealth } from './services/api'

type BackendStatus = 'checking' | 'connected' | 'unreachable'

function App() {
  const [status, setStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    let cancelled = false

    getHealth()
      .then(() => {
        if (!cancelled) setStatus('connected')
      })
      .catch(() => {
        if (!cancelled) setStatus('unreachable')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      <h1>Splitwise Pro</h1>
      <p>Backend: {status}</p>
    </main>
  )
}

export default App
