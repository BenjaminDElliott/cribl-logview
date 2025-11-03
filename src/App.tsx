import './App.css'
import { useStreamingLogs } from './hooks/useStreamingLogs'
import { LogTable } from './components/LogTable'

// Would normally use an env var but leaving it here for simplicity.
const LOG_URL = 'https://s3.amazonaws.com/io.cribl.c021.takehome/cribl.log'

function App() {
  const { logs, loading, error } = useStreamingLogs(LOG_URL)
  
  if (error) {
    return (
      <div className="app">
        <h1>Log Viewer</h1>
        <div className="error">Error loading logs: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="app">
      <h1>Log Viewer</h1>
      <LogTable logs={logs} loading={loading} />
    </div>
  )
}

export default App