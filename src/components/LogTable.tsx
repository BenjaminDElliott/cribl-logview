import { LogEntry } from './LogEntry'
import type { LogEntryType } from '../types'
import { useEffect, useMemo, useRef, useState } from 'react'

interface LogTableProps {
  logs: LogEntryType[]
  loading: boolean
}

export function LogTable({ logs, loading }: LogTableProps) {
  if (loading && logs.length === 0) {
    return <div className="loading">Loading logs...</div>
  }
  
  if (logs.length === 0) {
    return <div className="empty">No logs available</div>
  }
  
  const ROW_HEIGHT = 48
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewportHeight, setViewportHeight] = useState(500)

  useEffect(() => {
    const computeHeight = () => {
      if (typeof window === 'undefined') return
      const containerTop = containerRef.current?.getBoundingClientRect().top ?? 0
      const padding = 16
      const h = Math.max(200, Math.floor(window.innerHeight - containerTop - padding))
      setViewportHeight(h)
    }
    computeHeight()
    window.addEventListener('resize', computeHeight)
    return () => window.removeEventListener('resize', computeHeight)
  }, [])

  const OVERSCAN = 8
  const [scrollTop, setScrollTop] = useState(0)
  const total = logs.length
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(total, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN)
  const items = useMemo(() => logs.slice(startIndex, endIndex), [logs, startIndex, endIndex])
  const offsetY = startIndex * ROW_HEIGHT

  return (
    <div className="log-table-container" ref={containerRef}>
      <table className="log-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th className="time-column">Time</th>
            <th className="event-column">Event</th>
          </tr>
        </thead>
      </table>

      <div
        style={{ height: viewportHeight, overflow: 'auto', position: 'relative' }}
        onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
      >
        <div style={{ height: total * ROW_HEIGHT, position: 'relative' }}>
          <table
            className="log-table"
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${offsetY}px)`,
              tableLayout: 'fixed',
              width: '100%'
            }}
          >
            <tbody>
              {items.map((entry, i) => (
                <LogEntry key={String((entry as LogEntryType)._time ?? startIndex + i)} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && <div className="streaming-indicator">Streaming...</div>}
    </div>
  )
}

