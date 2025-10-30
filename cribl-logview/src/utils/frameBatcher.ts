export type FrameScheduler = (cb: FrameRequestCallback) => number

export function createFrameBatcher<T>(onFlush: (items: T[]) => void, schedule?: FrameScheduler) {
  let pending: T[] = []
  let scheduled = false
  const raf: FrameScheduler = schedule || (typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb: FrameRequestCallback) => (setTimeout(() => cb(performance.now()), 16) as unknown as number))

  const flush = () => {
    scheduled = false
    if (pending.length === 0) return
    const toFlush = pending
    pending = []
    onFlush(toFlush)
  }

  const push = (item: T) => {
    pending.push(item)
    if (!scheduled) {
      scheduled = true
      raf(() => flush())
    }
  }

  const flushNow = () => {
    if (scheduled) scheduled = false
    if (pending.length === 0) return
    const toFlush = pending
    pending = []
    onFlush(toFlush)
  }

  return { push, flushNow }
}


