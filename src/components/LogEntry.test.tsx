import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogEntry } from './LogEntry'

const renderLogEntry = (entry: typeof mockEntry) => {
  return render(
    <table>
      <tbody>
        <LogEntry entry={entry} />
      </tbody>
    </table>
  )
}

function makeLogs(n: number) {
  return Array.from({ length: n }, (_, i) => ({ _time: String(1_700_000_000_000 + i), message: `m${i}` }))
}

describe('LogEntry', () => {
  const mockEntry = {
    _time: '1724323612592',
    cid: 'api',
    channel: 'test-channel',
    level: 'info',
    message: 'test message'
  }

  it('should render time in ISO format', () => {
    renderLogEntry(mockEntry)
    const timeCell = screen.getByText(new RegExp(/2024-08/))
    expect(timeCell).toBeDefined()
  })

  it('should render collapsed JSON by default', () => {
    renderLogEntry(mockEntry)
    const jsonContent = screen.getByText(/"cid":"api"/)
    expect(jsonContent).toBeDefined()
  })

  it('should expand when clicked', async () => {
    const { container } = renderLogEntry(mockEntry)
    const preElement = container.querySelector('pre')
    
    expect(preElement?.className).toBe('collapsed')
    
    const row = screen.getByText(/test message/).closest('tr')
    if (row) {
      await userEvent.click(row)
      await waitFor(() => {
        expect(preElement?.className).toBe('expanded')
      })
    }
  })
})

