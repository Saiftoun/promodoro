import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PHASES,
  DEFAULT_SETTINGS,
  createIdleState,
  normalizeSettings,
  start,
  pause,
  resume,
  skip,
  reset,
  getRemaining,
  advanceIfExpired,
} from './timer.js'

const MIN = 60 * 1000

// Classic settings: 25 min focus, 5 min short break, 15 min long break, 4 cycles.
const CLASSIC = {
  focusMs: 25 * MIN,
  shortBreakMs: 5 * MIN,
  longBreakMs: 15 * MIN,
  cyclesBeforeLongBreak: 4,
}

function assertNotMutated(original, result) {
  assert.deepStrictEqual(original, structuredClone(original))
  assert.notStrictEqual(original, result)
}

test('createIdleState returns the documented idle shape', () => {
  assert.deepStrictEqual(createIdleState(), {
    phase: 'idle',
    phaseStartedAt: null,
    phaseDuration: null,
    paused: false,
    remainingWhenPaused: null,
    cycleCount: 0,
  })
})

test('normalizeSettings accepts valid settings and returns a copy', () => {
  const copy = normalizeSettings(CLASSIC)
  assert.deepStrictEqual(copy, CLASSIC)
  assert.notStrictEqual(copy, CLASSIC)
  assert.deepStrictEqual(normalizeSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS)
})

test('full classic cycle 25/5 with long break after 4 focus periods', () => {
  let state = start(createIdleState(), CLASSIC, 0)
  assert.strictEqual(state.phase, PHASES.FOCUS)
  assert.strictEqual(state.phaseStartedAt, 0)
  assert.strictEqual(state.phaseDuration, 25 * MIN)
  assert.strictEqual(state.cycleCount, 0)

  // Focus 1 -> short break (25m)
  state = advanceIfExpired(state, CLASSIC, 25 * MIN)
  assert.strictEqual(state.phase, PHASES.SHORT_BREAK)
  assert.strictEqual(state.cycleCount, 1)
  assert.strictEqual(state.phaseStartedAt, 25 * MIN)
  assert.strictEqual(state.phaseDuration, 5 * MIN)

  // Break ends -> focus 2 (30m), short break again (55m)
  state = advanceIfExpired(state, CLASSIC, 30 * MIN)
  state = advanceIfExpired(state, CLASSIC, 55 * MIN)
  assert.strictEqual(state.phase, PHASES.SHORT_BREAK)
  assert.strictEqual(state.cycleCount, 2)

  // 3rd short break ends at 90; the 4th focus period runs 90-115
  state = advanceIfExpired(state, CLASSIC, 60 * MIN)
  state = advanceIfExpired(state, CLASSIC, 85 * MIN)
  assert.strictEqual(state.phase, PHASES.SHORT_BREAK)
  assert.strictEqual(state.cycleCount, 3)
  state = advanceIfExpired(state, CLASSIC, 90 * MIN)
  assert.strictEqual(state.phase, PHASES.FOCUS)
  assert.strictEqual(state.cycleCount, 3)

  // 4th completed focus period (ends at 115) -> long break (15 min)
  state = advanceIfExpired(state, CLASSIC, 115 * MIN)
  assert.strictEqual(state.phase, PHASES.LONG_BREAK)
  assert.strictEqual(state.cycleCount, 4)
  assert.strictEqual(state.phaseDuration, 15 * MIN)

  // Long break ends (at 130) -> focus, cycleCount reset to 0
  state = advanceIfExpired(state, CLASSIC, 130 * MIN)
  assert.strictEqual(state.phase, PHASES.FOCUS)
  assert.strictEqual(state.cycleCount, 0)
  assert.strictEqual(state.phaseStartedAt, 130 * MIN)
  assert.strictEqual(state.phaseDuration, 25 * MIN)
})

test('pause then resume keeps the right remaining time', () => {
  let state = start(createIdleState(), CLASSIC, 0)

  // Pause after 10 min: 15 min must be stored
  state = pause(state, 10 * MIN)
  assert.strictEqual(state.paused, true)
  assert.strictEqual(state.remainingWhenPaused, 15 * MIN)
  // Stays correct even as the clock keeps moving while paused
  assert.strictEqual(getRemaining(state, 20 * MIN), 15 * MIN)
  assert.strictEqual(getRemaining(state, 100 * MIN), 15 * MIN)

  // Resume after 10 more min: continues from 15 min left
  state = resume(state, 20 * MIN)
  assert.strictEqual(state.paused, false)
  assert.strictEqual(state.remainingWhenPaused, null)
  assert.strictEqual(getRemaining(state, 25 * MIN), 10 * MIN)
  assert.strictEqual(getRemaining(state, 35 * MIN), 0)

  // Phase actually ends at 35 min (resumed end = 20 + 15)
  state = advanceIfExpired(state, CLASSIC, 35 * MIN)
  assert.strictEqual(state.phase, PHASES.SHORT_BREAK)
  assert.strictEqual(state.phaseStartedAt, 35 * MIN)
})

test('pause while already paused and resume while running are safe no-ops', () => {
  let state = start(createIdleState(), CLASSIC, 0)
  state = pause(state, MIN)
  const pausedTwice = pause(state, 2 * MIN)
  assert.deepStrictEqual(pausedTwice, state)
  assert.notStrictEqual(pausedTwice, state)

  const running = resume(state, 2 * MIN)
  const resumedAgain = resume(running, 3 * MIN)
  assert.strictEqual(resumedAgain.paused, false)
  // A resume of a running state must not shift the phase start:
  // paused at 1 min -> 24 min remained -> new phase start is 2 - 1 = 1 min,
  // and a second resume() call changes nothing.
  assert.strictEqual(running.phaseStartedAt, 1 * MIN)
  assert.strictEqual(resumedAgain.phaseStartedAt, 1 * MIN)
  assert.strictEqual(getRemaining(resumedAgain, 2 * MIN), 24 * MIN)
  assert.strictEqual(getRemaining(resumedAgain, 26 * MIN), 0)
})

test('skip from each phase', () => {
  // skip focus -> next break type (short, cycle 1)
  let state = start(createIdleState(), CLASSIC, 0)
  state = skip(state, CLASSIC, 5 * MIN)
  assert.strictEqual(state.phase, PHASES.SHORT_BREAK)
  assert.strictEqual(state.cycleCount, 1)
  assert.strictEqual(state.phaseStartedAt, 5 * MIN)

  // skip short break -> focus (cycleCount unchanged)
  state = skip(state, CLASSIC, 6 * MIN)
  assert.strictEqual(state.phase, PHASES.FOCUS)
  assert.strictEqual(state.cycleCount, 1)

  // Run 3 more focus periods with skips: focus -> long break at cycle 4
  state = skip(state, CLASSIC, 7 * MIN) // focus -> short (2)
  assert.strictEqual(state.cycleCount, 2)
  state = skip(state, CLASSIC, 8 * MIN) // short -> focus
  state = skip(state, CLASSIC, 9 * MIN) // focus -> short (3)
  state = skip(state, CLASSIC, 10 * MIN) // short -> focus
  state = skip(state, CLASSIC, 11 * MIN) // focus -> long break (4)
  assert.strictEqual(state.phase, PHASES.LONG_BREAK)
  assert.strictEqual(state.cycleCount, 4)

  // skip long break -> focus, cycleCount reset to 0
  state = skip(state, CLASSIC, 12 * MIN)
  assert.strictEqual(state.phase, PHASES.FOCUS)
  assert.strictEqual(state.cycleCount, 0)

  // skip while paused clears the pause
  state = pause(state, 13 * MIN)
  state = skip(state, CLASSIC, 14 * MIN)
  assert.strictEqual(state.paused, false)
  assert.strictEqual(state.phase, PHASES.SHORT_BREAK)
  assert.strictEqual(state.cycleCount, 1)
})

test('skip from idle throws', () => {
  assert.throws(
    () => skip(createIdleState(), CLASSIC, 0),
    /cannot skip from the idle phase/i,
  )
})

test('start from a non-idle phase throws', () => {
  const state = start(createIdleState(), CLASSIC, 0)
  assert.throws(
    () => start(state, CLASSIC, MIN),
    /start\(\) can only be called from the idle phase/i,
  )
})

test('reset returns to idle with cycleCount 0', () => {
  let state = start(createIdleState(), CLASSIC, 0)
  state = skip(state, CLASSIC, MIN)
  assert.strictEqual(state.cycleCount, 1)
  const resetState = reset()
  assert.deepStrictEqual(resetState, createIdleState())
  assert.strictEqual(resetState.cycleCount, 0)
  // After a reset, start() works again
  const restarted = start(resetState, CLASSIC, 2 * MIN)
  assert.strictEqual(restarted.phase, PHASES.FOCUS)
})

test('getRemaining is never negative and is 0 while idle', () => {
  assert.strictEqual(getRemaining(createIdleState(), 0), 0)
  assert.strictEqual(getRemaining(createIdleState(), 999 * MIN), 0)

  const state = start(createIdleState(), CLASSIC, 0)
  // Far in the future without advancing: clamped to 0, not negative
  assert.strictEqual(getRemaining(state, 1000 * MIN), 0)
  assert.strictEqual(getRemaining(state, 0), 25 * MIN)
  assert.strictEqual(getRemaining(state, 24.5 * MIN), 30 * 1000)
})

test('getRemaining is correct while paused', () => {
  let state = start(createIdleState(), CLASSIC, 0)
  state = pause(state, 5 * MIN)
  assert.strictEqual(getRemaining(state, 5 * MIN), 20 * MIN)
  assert.strictEqual(getRemaining(state, 50 * MIN), 20 * MIN)
  // Pause at the exact end of a phase: clamped to 0
  state = resume(state, 5 * MIN)
  state = pause(state, 25 * MIN)
  assert.strictEqual(getRemaining(state, 25 * MIN), 0)
})

test('advanceIfExpired handles several phases expired at once', () => {
  // Server offline from t=0 to t=56 min: focus (0-25) and short break (25-30)
  // have both expired, and the next focus (30-55) has just expired too.
  let state = start(createIdleState(), CLASSIC, 0)
  state = advanceIfExpired(state, CLASSIC, 55 * MIN + 1)
  // Boundaries are carried over exactly: short break ran 25-30, focus 30-55,
  // so the state must now be a short break that started at 55.
  assert.strictEqual(state.phase, PHASES.SHORT_BREAK)
  assert.strictEqual(state.cycleCount, 2)
  assert.strictEqual(state.phaseStartedAt, 55 * MIN)
  assert.strictEqual(getRemaining(state, 56 * MIN), 4 * MIN)

  // Offline for 90 min: 3 focus periods and 3 short breaks completed.
  state = start(createIdleState(), CLASSIC, 0)
  state = advanceIfExpired(state, CLASSIC, 90 * MIN)
  // focus 0-25, short 25-30, focus 30-55, short 55-60, focus 60-85,
  // short 85-90 -> next focus starts at 90 with cycleCount 3
  assert.strictEqual(state.phase, PHASES.FOCUS)
  assert.strictEqual(state.cycleCount, 3)
  assert.strictEqual(state.phaseStartedAt, 90 * MIN)
  assert.strictEqual(state.phaseDuration, 25 * MIN)
  assert.strictEqual(getRemaining(state, 90 * MIN), 25 * MIN)
})

test('advanceIfExpired does nothing when the phase is not over', () => {
  let state = start(createIdleState(), CLASSIC, 0)
  const after = advanceIfExpired(state, CLASSIC, 10 * MIN)
  assert.deepStrictEqual(after, state)
  assert.notStrictEqual(after, state)
  assert.strictEqual(after.phase, PHASES.FOCUS)
  assert.strictEqual(getRemaining(after, 10 * MIN), 15 * MIN)
})

test('advanceIfExpired does nothing while paused', () => {
  let state = start(createIdleState(), CLASSIC, 0)
  state = pause(state, 10 * MIN)
  const after = advanceIfExpired(state, CLASSIC, 1000 * MIN)
  assert.strictEqual(after.paused, true)
  assert.strictEqual(after.phase, PHASES.FOCUS)
  assert.strictEqual(after.cycleCount, 0)
  assert.strictEqual(after.remainingWhenPaused, 15 * MIN)
  assert.deepStrictEqual(after, state)
})

test('advanceIfExpired from idle does nothing', () => {
  const idle = createIdleState()
  const after = advanceIfExpired(idle, CLASSIC, 1000 * MIN)
  assert.deepStrictEqual(after, idle)
})

test('no function mutates the input state', () => {
  const idle = createIdleState()
  const started = start(idle, CLASSIC, 0)
  assertNotMutated(idle, started)

  const s1 = { ...started }
  const paused = pause(s1, 5 * MIN)
  assertNotMutated(s1, paused)

  const s2 = { ...paused }
  const resumed = resume(s2, 6 * MIN)
  assertNotMutated(s2, resumed)

  const s3 = { ...resumed }
  const skipped = skip(s3, CLASSIC, 7 * MIN)
  assertNotMutated(s3, skipped)

  const s4 = { ...skipped }
  const advanced = advanceIfExpired(s4, CLASSIC, 1000 * MIN)
  assertNotMutated(s4, advanced)

  const resetState = reset()
  assert.deepStrictEqual(resetState, createIdleState())
})

test('invalid settings throw with a clear message', () => {
  const invalids = [
    null,
    undefined,
    {},
    { ...CLASSIC, focusMs: 0 },
    { ...CLASSIC, focusMs: -5 },
    { ...CLASSIC, shortBreakMs: 0 },
    { ...CLASSIC, longBreakMs: NaN },
    { ...CLASSIC, focusMs: '25m' },
    { ...CLASSIC, cyclesBeforeLongBreak: 0 },
    { ...CLASSIC, cyclesBeforeLongBreak: -1 },
    { ...CLASSIC, cyclesBeforeLongBreak: 2.5 },
    { ...CLASSIC, cyclesBeforeLongBreak: '4' },
  ]
  for (const bad of invalids) {
    assert.throws(() => normalizeSettings(bad), Error, `settings: ${JSON.stringify(bad)}`)
  }

  // The same validation applies to the public actions
  const idle = createIdleState()
  const running = start(idle, CLASSIC, 0)
  assert.throws(() => start(idle, { ...CLASSIC, focusMs: 0 }, 0), /focusMs/)
  assert.throws(
    () => skip(running, { ...CLASSIC, cyclesBeforeLongBreak: 0 }, MIN),
    /cyclesBeforeLongBreak/,
  )
  assert.throws(
    () => advanceIfExpired(running, { ...CLASSIC, longBreakMs: -1 }, 100 * MIN),
    /longBreakMs/,
  )
})

test('skipping through a whole cycle respects cyclesBeforeLongBreak = 2', () => {
  const settings = { ...CLASSIC, cyclesBeforeLongBreak: 2 }
  let state = start(createIdleState(), settings, 0)
  state = skip(state, settings, MIN) // focus -> short (1)
  assert.strictEqual(state.phase, PHASES.SHORT_BREAK)
  state = skip(state, settings, 2 * MIN) // short -> focus
  state = skip(state, settings, 3 * MIN) // focus -> long break (2)
  assert.strictEqual(state.phase, PHASES.LONG_BREAK)
  state = skip(state, settings, 4 * MIN) // long -> focus, cycleCount 0
  assert.strictEqual(state.phase, PHASES.FOCUS)
  assert.strictEqual(state.cycleCount, 0)
})
