import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react'
import { LogTable } from './LogTable'

function makeLogs(n: number) {
  return Array.from({ length: n }, (_, i) => ({ _time: String(1_700_000_000_000 + i), message: `m${i}` }))
}

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

describe('LogTable virtualization', () => {
  it('renders only visible slice and updates on scroll', async () => {
    const logs = makeLogs(1000)

    // Predictable viewport
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)

    const { container } = render(<LogTable logs={logs} loading={false} />)

    const containerEl = container.querySelector('.log-table-container') as HTMLElement
    // Make container top 0 to maximize viewport height
    containerEl.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} })
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    // Initially, should render a subset of rows (not all 1000)
    const initialRows = container.querySelectorAll('tr.log-entry')
    expect(initialRows.length).toBeGreaterThan(10)
    expect(initialRows.length).toBeLessThan(60)

    // Verify some early message is visible
    expect(screen.getByText(/m0/)).toBeDefined()

    // Scroll down ~20 rows (row height is 48px)
    const scroller = containerEl.children[1] as HTMLDivElement
    act(() => {
      scroller.scrollTop = 48 * 200
      fireEvent.scroll(scroller)
    })

    // After scroll, a later message should be visible
    expect(await screen.findByText(/m200/)).toBeDefined()
  })

  it('recomputes viewport height on window resize and keeps slice bounded', async () => {
    const logs = makeLogs(500)
    const innerSpy = vi.spyOn(window, 'innerHeight', 'get')
    innerSpy.mockReturnValue(600)

    const { container } = render(<LogTable logs={logs} loading={false} />)
    const containerEl = container.querySelector('.log-table-container') as HTMLElement
    // @ts-expect-error test override
    containerEl.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} })
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    const initialRows = container.querySelectorAll('tr.log-entry')
    expect(initialRows.length).toBeGreaterThan(8)
    expect(initialRows.length).toBeLessThan(60)

    // Increase viewport height
    innerSpy.mockReturnValue(900)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    const moreRows = container.querySelectorAll('tr.log-entry')
    expect(moreRows.length).toBeGreaterThanOrEqual(initialRows.length)
    expect(moreRows.length).toBeLessThan(100)

    // Scroll and verify different content appears
    const scroller = containerEl.children[1] as HTMLDivElement
    act(() => {
      scroller.scrollTop = 48 * 100
      fireEvent.scroll(scroller)
    })
    expect(await screen.findByText(/m100/)).toBeDefined()
  })
})

