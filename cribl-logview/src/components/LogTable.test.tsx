import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LogTable } from './LogTable'

describe('LogTable', () => {
  const mockLogs = [
    {
      _time: '1724323612592',
      cid: 'api',
      message: 'test message 1'
    },
    {
      _time: '1724323612593',
      cid: 'api',
      message: 'test message 2'
    }
  ]

  it('should render loading state when loading', () => {
    render(<LogTable logs={[]} loading={true} />)
    expect(screen.getByText('Loading logs...')).toBeDefined()
  })

  it('should render empty state when no logs', () => {
    render(<LogTable logs={[]} loading={false} />)
    expect(screen.getByText('No logs available')).toBeDefined()
  })

  it('should render table with headers', () => {
    render(<LogTable logs={mockLogs} loading={false} />)
    expect(screen.getByText('Time')).toBeDefined()
    expect(screen.getByText('Event')).toBeDefined()
  })

  it('should render all log entries', () => {
    render(<LogTable logs={mockLogs} loading={false} />)
    expect(screen.getByText(/test message 1/)).toBeDefined()
    expect(screen.getByText(/test message 2/)).toBeDefined()
  })

  it('should show streaming indicator when loading more', () => {
    render(<LogTable logs={mockLogs} loading={true} />)
    expect(screen.getByText('Streaming...')).toBeDefined()
  })
})

