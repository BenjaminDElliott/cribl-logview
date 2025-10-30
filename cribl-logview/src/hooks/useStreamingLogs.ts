import { useState, useEffect, useRef } from 'react'
import { createFrameBatcher } from '../utils/frameBatcher'
import type { LogEntryType as LogEntry } from '../types'

async function* streamNDJSON(url: string): AsyncGenerator<LogEntry, void, unknown> {
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`)
  }
  
  if (!response.body) {
    throw new Error('Response body is null')
  }
  
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line) as LogEntry
          } catch {
            console.warn('Failed to parse log line:', line)
          }
        }
      }
    }
    
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer) as LogEntry
      } catch {
        console.warn('Failed to parse final log line:', buffer)
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function useStreamingLogs(url: string) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const isInitialLoadRef = useRef(true)
  const batcherRef = useRef<ReturnType<typeof createFrameBatcher<LogEntry>>>()
  
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      return
    }
    
    isInitialLoadRef.current = false
    
    setLoading(true)
    setError(null)
    setLogs([])
    batcherRef.current = createFrameBatcher<LogEntry>((items) => {
      setLogs(prev => (prev.length > 0 ? [...prev, ...items] : items))
    })
    
    const loadLogs = async () => {
      try {
        for await (const logEntry of streamNDJSON(url)) {
          batcherRef.current?.push(logEntry)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        batcherRef.current?.flushNow()
        setLoading(false)
      }
    }
    
    loadLogs()
  }, [url])
  
  return { logs, loading, error }
}

