import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStreamingLogs } from './useStreamingLogs'

describe('useStreamingLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should parse NDJSON stream and update logs progressively', async () => {
    const mockLog1 = { _time: '2024-01-01T00:00:00Z', message: 'test1' }
    const mockLog2 = { _time: '2024-01-01T00:01:00Z', message: 'test2' }
    const ndjson = `${JSON.stringify(mockLog1)}\n${JSON.stringify(mockLog2)}\n`

    globalThis.fetch = vi.fn(() => {
      const encoder = new TextEncoder()
      let offset = 0
      
      const stream = new ReadableStream({
        start(controller) {
          const sendChunk = () => {
            if (offset < ndjson.length) {
              const chunk = ndjson.slice(offset, offset + 5)
              controller.enqueue(encoder.encode(chunk))
              offset += 5
              setTimeout(sendChunk, 10)
            } else {
              controller.close()
            }
          }
          sendChunk()
        }
      })

      return Promise.resolve({
        ok: true,
        body: stream,
      } as Response)
    })

    const { result } = renderHook(() => useStreamingLogs('http://example.com/logs'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.logs).toHaveLength(2)
    expect(result.current.logs[0]).toEqual(mockLog1)
    expect(result.current.logs[1]).toEqual(mockLog2)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    const { result } = renderHook(() => useStreamingLogs('http://example.com/logs'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.logs).toHaveLength(0)
  })

  it('should handle malformed JSON gracefully', async () => {
    const validLog = { _time: '2024-01-01T00:00:00Z', message: 'valid' }
    const ndjson = `${JSON.stringify(validLog)}\ninvalid json\n${JSON.stringify(validLog)}\n`

    globalThis.fetch = vi.fn(() => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(ndjson))
          controller.close()
        }
      })

      return Promise.resolve({
        ok: true,
        body: stream,
      } as Response)
    })

    const { result } = renderHook(() => useStreamingLogs('http://example.com/logs'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.logs).toHaveLength(2)
    expect(result.current.logs[0]).toEqual(validLog)
    expect(result.current.logs[1]).toEqual(validLog)
  })

  it('should handle empty response', async () => {
    globalThis.fetch = vi.fn(() => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close()
        }
      })

      return Promise.resolve({
        ok: true,
        body: stream,
      } as Response)
    })

    const { result } = renderHook(() => useStreamingLogs('http://example.com/logs'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.logs).toHaveLength(0)
    expect(result.current.error).toBeNull()
  })

  it('sets error when response.ok is false', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, statusText: 'Bad', body: new ReadableStream() } as unknown as Response))
    const { result } = renderHook(() => useStreamingLogs('http://x'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.logs.length).toBe(0)
  })

  it('sets error when response.body is null', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, body: null } as unknown as Response))
    const { result } = renderHook(() => useStreamingLogs('http://x'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('parses trailing buffer JSON at end of stream', async () => {
    const encoder = new TextEncoder()
    const chunk = encoder.encode('{"_time":"1","message":"x"}')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk)
        controller.close()
      }
    })
    globalThis.fetch = vi.fn(async () => ({ ok: true, body: stream } as unknown as Response))
    const { result } = renderHook(() => useStreamingLogs('http://x'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.logs.length).toBe(1)
    expect(result.current.logs[0].message).toBe('x')
  })
})

