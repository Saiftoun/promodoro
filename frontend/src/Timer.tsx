import { useEffect, useState } from 'react'
import {
  PHASES,
  createIdleState,
  start,
  pause,
  resume,
  reset,
  getRemaining,
  advanceIfExpired,
} from '@shared/timer/timer.js'
import type { Settings } from './timerTypes.js'

// Classic settings (presets and custom durations are PROM-17).
// TEMPORARY TEST VALUES (uncommitted): to test a full cycle in about a minute
// use { focusMs: 20_000, shortBreakMs: 5_000, longBreakMs: 10_000, cyclesBeforeLongBreak: 2 }
const CLASSIC_SETTINGS: Settings = {
  focusMs: 25 * 60 * 1000,
  shortBreakMs: 5 * 60 * 1000,
  longBreakMs: 15 * 60 * 1000,
  cyclesBeforeLongBreak: 4,
}

const PHASE_LABELS: Record<string, string> = {
  [PHASES.IDLE]: 'Ready',
  [PHASES.FOCUS]: 'Focus',
  [PHASES.SHORT_BREAK]: 'Short break',
  [PHASES.LONG_BREAK]: 'Long break',
}

function formatMs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatCycle(state: { phase: string; cycleCount: number }): string {
  const total = CLASSIC_SETTINGS.cyclesBeforeLongBreak
  if (state.phase === PHASES.IDLE) {
    return `Focus session 1 of ${total}`
  }
  if (state.phase === PHASES.FOCUS) {
    return `Focus session ${state.cycleCount + 1} of ${total}`
  }
  return `${state.cycleCount} of ${total} focus sessions completed`
}

export default function Timer() {
  const [state, setState] = useState(createIdleState)

  const running = state.phase !== PHASES.IDLE
  const remaining = getRemaining(state, Date.now())
  const timeText = running ? formatMs(remaining) : formatMs(CLASSIC_SETTINGS.focusMs)
  const phaseLabel = PHASE_LABELS[state.phase]

  useEffect(() => {
    const intervalId = setInterval(() => {
      setState((current) => advanceIfExpired(current, CLASSIC_SETTINGS, Date.now()))
    }, 250)
    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    document.title = running ? `${timeText} ${phaseLabel}` : 'FocusRoom'
  }, [timeText, phaseLabel, running])

  return (
    <section className="timer" aria-label="Pomodoro timer">
      <p className="timer-phase">{phaseLabel}</p>
      <p className="timer-time" role="timer" aria-live="off">
        {timeText}
      </p>
      <p className="timer-cycle">{formatCycle(state)}</p>
      <div className="timer-actions">
        {state.phase === PHASES.IDLE && (
          <button type="button" onClick={() => setState((s) => start(s, CLASSIC_SETTINGS, Date.now()))}>
            Start
          </button>
        )}
        {running && !state.paused && (
          <button type="button" onClick={() => setState((s) => pause(s, Date.now()))}>
            Pause
          </button>
        )}
        {running && state.paused && (
          <button type="button" onClick={() => setState((s) => resume(s, Date.now()))}>
            Resume
          </button>
        )}
        {running && (
          <button type="button" onClick={() => setState(reset())}>
            Reset
          </button>
        )}
      </div>
    </section>
  )
}
