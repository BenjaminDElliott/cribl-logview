import { memo, useMemo, useState } from 'react'
import type { LogEntryType } from '../types'

interface LogEntryProps {
  entry: LogEntryType
}

function LogEntryComponent({ entry }: LogEntryProps) {
  const [expanded, setExpanded] = useState(false)
  const time = useMemo(() => new Date(Number(entry._time)).toISOString(), [entry._time])
  const collapsedJson = useMemo(() => JSON.stringify(entry), [entry])
  const expandedJson = useMemo(() => JSON.stringify(entry, null, 2), [entry])
  
  return (
    <tr className="log-entry" onClick={() => setExpanded(!expanded)}>
      <td className="time-column">{time}</td>
      <td className="event-column">
        <pre className={expanded ? 'expanded' : 'collapsed'}>
          {expanded ? expandedJson : collapsedJson}
        </pre>
      </td>
    </tr>
  )
}

export const LogEntry = memo(LogEntryComponent)

