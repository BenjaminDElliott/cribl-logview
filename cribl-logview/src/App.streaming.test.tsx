import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStreamingLogs } from './hooks/useStreamingLogs'

// Deterministic streaming test focused on the hook (UI virtualization tested separately)

describe('useStreamingLogs streaming behavior', () => {
  let rafSpy: ReturnType<typeof vi.spyOn> | null = null

  beforeEach(() => {
    // Make requestAnimationFrame synchronous to avoid timer flakiness
    rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame' as any).mockImplementation((cb: FrameRequestCallback) => {
      cb(performance.now())
      return 1 as unknown as number
    })
  })

  afterEach(() => {
    rafSpy?.mockRestore()
    rafSpy = null
  })

  it('updates progressively as stream chunks arrive and completes at end', async () => {
    // Build a controllable ReadableStream that we can push lines into
    type Chunk = Uint8Array | null
    const encoder = new TextEncoder()
    const queue: Chunk[] = []
    let notify: (() => void) | null = null

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        // debug: pull requested
        // eslint-disable-next-line no-console
        console.debug('[test] stream.pull called; queue len:', queue.length)
        if (queue.length === 0) {
          await new Promise<void>(resolve => (notify = resolve))
        }
        const next = queue.shift() ?? null
        if (next === null) {
          // eslint-disable-next-line no-console
          console.debug('[test] controller.close() called')
          controller.close()
          return
        }
        // eslint-disable-next-line no-console
        console.debug('[test] controller.enqueue chunk bytes:', next.byteLength)
        controller.enqueue(next)
      }
    })

    const pushLines = (lines: string[]) => {
      const ndjson = lines.join('\n') + '\n'
      queue.push(encoder.encode(ndjson))
      // eslint-disable-next-line no-console
      console.debug('[test] pushed lines:', lines.length, 'queue len now:', queue.length)
      notify?.()
      notify = null
    }

    // Mock fetch
    globalThis.fetch = vi.fn(async () => {
      // eslint-disable-next-line no-console
      console.debug('[test] fetch() mocked called, returning stream')
      return { ok: true, body: stream } as unknown as Response
    })

    const { result } = renderHook(() => useStreamingLogs('http://example.com/logs'))

    // First batch
    pushLines([
      JSON.stringify({ _time: '1', message: 'a' }),
      JSON.stringify({ _time: '2', message: 'b' }),
    ])

    await waitFor(() => {
      expect(result.current.logs.length).toBe(2)
      expect(result.current.loading).toBe(true)
    }, { timeout: 15000 })
    // eslint-disable-next-line no-console
    console.debug('[test] after batch1 logs:', result.current.logs.length)

    // Second batch
    pushLines([
      JSON.stringify({ _time: '3', message: 'c' }),
      JSON.stringify({ _time: '4', message: 'd' }),
      JSON.stringify({ _time: '5', message: 'e' }),
    ])

    await waitFor(() => {
      expect(result.current.logs.length).toBe(5)
    }, { timeout: 15000 })
    // eslint-disable-next-line no-console
    console.debug('[test] after batch2 logs:', result.current.logs.length)

    // Complete stream
    queue.push(null)
    notify?.()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.logs.length).toBe(5)
    }, { timeout: 15000 })
    // eslint-disable-next-line no-console
    console.debug('[test] after close logs:', result.current.logs.length)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import App from './App'

// Generate NDJSON with N entries
function generateNdjson(count: number) {
  const lines: string[] = []
  for (let i = 0; i < count; i++) {
    lines.push(JSON.stringify({ _time: String(1724323612592 + i), message: `m${i}` }))
  }
  return lines.join('\n') + '\n'
}

describe.skip('App streaming performance', () => {
  let restoreRAF: (() => void) | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    const cbs: FrameRequestCallback[] = []
    const spy = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cbs.push(cb)
        return 1 as unknown as number
      })
    const runFrame = () => {
      const all = cbs.splice(0, cbs.length)
      all.forEach(cb => cb(performance.now()))
    }
    // @ts-expect-error expose helper for this test scope
    globalThis.__runFrame = runFrame
    restoreRAF = () => spy.mockRestore()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    // @ts-expect-error cleanup
    delete globalThis.__runFrame
    restoreRAF?.()
    restoreRAF = null
  })

  it('progressively renders by batches and finishes at end', async () => {
    const total = 180 // > 3 batches at batch size 50
    const lines: string[] = []
    for (let i = 0; i < total; i++) {
      lines.push(JSON.stringify({ _time: String(1724323612592 + i), message: `m${i}` }))
    }

    // Controlled stream with backpressure-aware pull() using a simple queue
    const encoder = new TextEncoder()
    const queue: (Uint8Array | null)[] = []
    let notify: (() => void) | null = null

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        // Wait until there is data
        if (queue.length === 0) {
          await new Promise<void>(resolve => (notify = resolve))
        }
        const next = queue.shift()
        if (next === null) {
          controller.close()
          return
        }
        if (next) controller.enqueue(next)
      }
    })

    const pushLines = (start: number, endExclusive: number) => {
      const chunk = lines.slice(start, endExclusive).join('\n') + '\n'
      queue.push(encoder.encode(chunk))
      // Wake the reader if waiting
      notify?.()
      notify = null
    }

    globalThis.fetch = vi.fn(async () => ({ ok: true, body: stream } as unknown as Response))

    // Ensure predictable viewport for virtualization
    const innerHeightSpy = vi
      .spyOn(window, 'innerHeight', 'get')
      .mockReturnValue(800)
    const { container } = render(<App />)
    const containerEl = container.querySelector('.log-table-container') as HTMLElement
    if (containerEl) {
      // @ts-expect-error override for test
      containerEl.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} })
      window.dispatchEvent(new Event('resize'))
    }
    // Ensure any scheduled frame/timeouts run to compute initial viewport
    // @ts-expect-error test helper
    globalThis.__runFrame()
    vi.advanceTimersByTime(0)
    await Promise.resolve()

    // Initially shows top-level loading
    expect(screen.getByText('Loading logs...')).toBeDefined()

    // Push first batch of 50 -> should render table with those entries while still streaming
    pushLines(0, 50)
    // Drive one animation frame to flush batched state
    // @ts-expect-error test helper
    globalThis.__runFrame()
    vi.advanceTimersByTime(0)
    await Promise.resolve()
    expect(await screen.findByText(/m0/)).toBeDefined()
    expect(await screen.findByText(/m49/)).toBeDefined()
    expect(await screen.queryByText(/m99/, {})).toBeNull()
    // Streaming indicator visible (loading true)
    expect(screen.getByText('Streaming...')).toBeDefined()

    // Push second batch of 50 -> more entries appear
    pushLines(50, 100)
    // @ts-expect-error test helper
    globalThis.__runFrame()
    vi.advanceTimersByTime(0)
    await Promise.resolve()
    expect(await screen.findByText(/m99/)).toBeDefined()
    expect(screen.getByText('Streaming...')).toBeDefined()

    // Push remaining 80 -> complete and loading false
    pushLines(100, 180)
    // Signal close
    queue.push(null)
    notify?.()
    // @ts-expect-error test helper
    globalThis.__runFrame()
    vi.advanceTimersByTime(0)
    await Promise.resolve()
    expect(await screen.findByText(/m179/)).toBeDefined()

    // Done
  })
})


