import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFrameBatcher } from './frameBatcher'

describe('createFrameBatcher', () => {
  let callbacks: FrameRequestCallback[]

  const mockRAF = (cb: FrameRequestCallback) => {
    callbacks.push(cb)
    return 1 as unknown as number
  }

  beforeEach(() => {
    callbacks = []
  })

  afterEach(() => {
    callbacks = []
  })

  const runFrame = () => {
    const toRun = callbacks.splice(0, callbacks.length)
    toRun.forEach(cb => cb(performance.now()))
  }

  it('coalesces multiple pushes into a single flush per frame', () => {
    const flushed: number[][] = []
    const batcher = createFrameBatcher<number>((items) => flushed.push(items), mockRAF)

    batcher.push(1)
    batcher.push(2)
    batcher.push(3)
    expect(flushed.length).toBe(0)
    runFrame()
    expect(flushed).toEqual([[1,2,3]])
  })

  it('flushNow emits immediately', () => {
    const flushed: number[][] = []
    const batcher = createFrameBatcher<number>((items) => flushed.push(items), mockRAF)

    batcher.push(1)
    batcher.flushNow()
    expect(flushed).toEqual([[1]])
  })
})


