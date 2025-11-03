# Cribl Log Viewer

## Implementation

Uses `ReadableStream` with an async generator function to parse NDJSON line-by-line as chunks arrive. Each parsed log entry is pushed into a buffer, which coalesces multiple entries and schedules a single state update via `requestAnimationFrame` per animation frame. This optimizes render performance (one React update per frame) while enabling progressive rendering—logs appear immediately upon arrival, achieving optimal time-to-first-byte without waiting for the full download.

## Acceptance Criteria

✅ **Two-column table**: Time (ISO 8601) and Event (single-line JSON)  
✅ **Expand/collapse**: Click rows to toggle multiline JSON view  
✅ **Streaming**: Progressive NDJSON parsing with immediate rendering  
✅ **Tests**: 20 passing tests across components, hooks, and utilities

## Test Coverage

- LogEntry: time formatting, expand/collapse
- LogTable: states, virtualization, scroll/resize
- useStreamingLogs: progressive updates, error handling, malformed JSON
- frameBatcher: requestAnimationFrame batching
- Integration: end-to-end streaming behavior

## Additional Tests (Given More Time)

- Large payloads & memory limits
- Network interruption/reconnection
- Performance metrics (50k+ entries)
- Edge cases: missing fields, unicode, partial JSON

