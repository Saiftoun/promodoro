export const PHASES = {
  IDLE: 'idle',
  FOCUS: 'focus',
  SHORT_BREAK: 'short_break',
  LONG_BREAK: 'long_break',
}

export const DEFAULT_SETTINGS = {
  focusMs: 25 * 60 * 1000,
  shortBreakMs: 5 * 60 * 1000,
  longBreakMs: 15 * 60 * 1000,
  cyclesBeforeLongBreak: 4,
  // Total number of focus cycles (a cycle ends with a long break) after
  // which the timer stops. null = no limit: the cycle repeats forever.
  totalCycles: null,
}

/**
 * Create the initial idle state.
 */
export function createIdleState() {
  return {
    phase: PHASES.IDLE,
    phaseStartedAt: null,
    phaseDuration: null,
    paused: false,
    remainingWhenPaused: null,
    cycleCount: 0,
    longBreaksCompleted: 0,
    // true when the timer reached the end of the last allowed cycle
    // (settings.totalCycles) and stopped by itself. reset() or a new
    // start() clears it.
    sessionComplete: false,
  }
}

/**
 * Validate a settings object and return a normalized copy.
 * Throws a clear Error on invalid input.
 */
export function normalizeSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Invalid settings: settings must be an object.')
  }
  for (const name of ['focusMs', 'shortBreakMs', 'longBreakMs']) {
    const value = settings[name]
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new Error(
        `Invalid settings: ${name} must be a positive finite number of milliseconds (got ${value}).`,
      )
    }
  }
  const { cyclesBeforeLongBreak, totalCycles } = settings
  if (
    !Number.isInteger(cyclesBeforeLongBreak) ||
    cyclesBeforeLongBreak < 1
  ) {
    throw new Error(
      `Invalid settings: cyclesBeforeLongBreak must be an integer of at least 1 (got ${cyclesBeforeLongBreak}).`,
    )
  }
  if (
    totalCycles !== undefined &&
    totalCycles !== null &&
    (!Number.isInteger(totalCycles) || totalCycles < 1)
  ) {
    throw new Error(
      `Invalid settings: totalCycles must be null (no limit) or an integer of at least 1 (got ${totalCycles}).`,
    )
  }
  return {
    focusMs: settings.focusMs,
    shortBreakMs: settings.shortBreakMs,
    longBreakMs: settings.longBreakMs,
    cyclesBeforeLongBreak: settings.cyclesBeforeLongBreak,
    totalCycles: totalCycles === undefined ? null : totalCycles,
  }
}

/**
 * Milliseconds remaining in the current phase, never below 0.
 * Correct while paused. Time is always passed in as `now` (milliseconds);
 * this module never reads the clock itself.
 */
export function getRemaining(state, now) {
  if (state.phase === PHASES.IDLE) {
    return 0
  }
  if (state.paused) {
    return Math.max(0, state.remainingWhenPaused)
  }
  return Math.max(0, state.phaseDuration - (now - state.phaseStartedAt))
}

/**
 * idle -> focus.
 */
export function start(state, settings, now) {
  const valid = normalizeSettings(settings)
  if (state.phase !== PHASES.IDLE) {
    throw new Error(
      `Invalid action: start() can only be called from the idle phase (current phase: ${state.phase}). Use reset() first.`,
    )
  }
  return {
    ...state,
    phase: PHASES.FOCUS,
    phaseStartedAt: now,
    phaseDuration: valid.focusMs,
    paused: false,
    remainingWhenPaused: null,
    cycleCount: 0,
    longBreaksCompleted: 0,
    sessionComplete: false,
  }
}

/**
 * Pause the current phase: the remaining time is stored in remainingWhenPaused.
 */
export function pause(state, now) {
  if (state.phase === PHASES.IDLE) {
    throw new Error('Invalid action: pause() cannot be called while idle.')
  }
  if (state.paused) {
    return { ...state }
  }
  return {
    ...state,
    paused: true,
    remainingWhenPaused: getRemaining(state, now),
  }
}

/**
 * Resume a paused phase: it continues from the stored remaining time.
 */
export function resume(state, now) {
  if (!state.paused) {
    return { ...state }
  }
  const remaining = Math.max(0, state.remainingWhenPaused)
  return {
    ...state,
    paused: false,
    remainingWhenPaused: null,
    phaseStartedAt: now - (state.phaseDuration - remaining),
  }
}

/**
 * Apply the transition to the next phase as if the current phase ended at
 * nextStartedAt. Pure: returns a new state.
 */
function transitionToNext(state, settings, nextStartedAt) {
  if (state.phase === PHASES.IDLE) {
    throw new Error(
      'Invalid action: cannot skip or advance from the idle phase. Use start() first.',
    )
  }
  const valid = normalizeSettings(settings)

  if (state.phase === PHASES.FOCUS) {
    const cycleCount = state.cycleCount + 1
    const isLongBreak =
      cycleCount % valid.cyclesBeforeLongBreak === 0
    return {
      ...state,
      phase: isLongBreak ? PHASES.LONG_BREAK : PHASES.SHORT_BREAK,
      phaseStartedAt: nextStartedAt,
      phaseDuration: isLongBreak
        ? valid.longBreakMs
        : valid.shortBreakMs,
      paused: false,
      remainingWhenPaused: null,
      cycleCount,
    }
  }

  // Any break -> focus. A long break ends the cycle: cycleCount resets to 0
  // and the completed-cycle count grows. When the settings set totalCycles
  // and this long break was the last allowed one, the session ends: the
  // timer returns to idle with sessionComplete = true instead of starting
  // another focus period.
  const completedCycles =
    state.phase === PHASES.LONG_BREAK
      ? state.longBreaksCompleted + 1
      : state.longBreaksCompleted
  if (
    state.phase === PHASES.LONG_BREAK &&
    valid.totalCycles !== null &&
    completedCycles >= valid.totalCycles
  ) {
    return {
      ...createIdleState(),
      longBreaksCompleted: completedCycles,
      sessionComplete: true,
    }
  }
  const cycleCount =
    state.phase === PHASES.LONG_BREAK ? 0 : state.cycleCount
  return {
    ...state,
    phase: PHASES.FOCUS,
    phaseStartedAt: nextStartedAt,
    phaseDuration: valid.focusMs,
    paused: false,
    remainingWhenPaused: null,
    cycleCount,
    longBreaksCompleted: completedCycles,
  }
}

/**
 * Move to the next phase immediately.
 * Works while running or paused (a skip clears the pause).
 */
export function skip(state, settings, now) {
  if (state.phase === PHASES.IDLE) {
    throw new Error(
      'Invalid action: cannot skip from the idle phase. Use start() first.',
    )
  }
  return transitionToNext(state, settings, now)
}

/**
 * If the current phase has ended, move to the next phase. If several phases
 * have expired (for example the server was offline), keep advancing until the
 * state is current, carrying over the exact phase boundaries. Does nothing
 * while paused. Returns a new state; never mutates the input.
 */
export function advanceIfExpired(state, settings, now) {
  let current = { ...state }
  while (
    current.phase !== PHASES.IDLE &&
    !current.paused &&
    getRemaining(current, now) === 0
  ) {
    const nextStartedAt = current.phaseStartedAt + current.phaseDuration
    current = transitionToNext(current, settings, nextStartedAt)
  }
  return current
}

/**
 * Back to idle with cycleCount 0.
 */
export function reset() {
  return createIdleState()
}
