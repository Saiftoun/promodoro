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

interface TimerProps {
  settings: Settings
  onIdleChange: (idle: boolean) => void
}

export default function Timer({ settings, onIdleChange }: TimerProps) {
  const [state, setState] = useState(createIdleState)

  const running = state.phase !== PHASES.IDLE
  const remaining = getRemaining(state, Date.now())
  const timeText = running ? formatMs(remaining) : formatMs(settings.focusMs)
  const phaseLabel = PHASE_LABELS[state.phase]

  useEffect(() => {
    const intervalId = setInterval(() => {
      setState((current) => advanceIfExpired(current, settings, Date.now()))
    }, 250)
    return () => clearInterval(intervalId)
  }, [settings])

  useEffect(() => {
    onIdleChange(state.phase === PHASES.IDLE)
  }, [state.phase, onIdleChange])

  useEffect(() => {
    document.title = running ? `${timeText} ${phaseLabel}` : 'FocusRoom'
  }, [timeText, phaseLabel, running])

  return (
    <section className="timer" aria-label="Pomodoro timer">
      <p className="timer-phase">{phaseLabel}</p>
      <p className="timer-time" role="timer" aria-live="off">
        {timeText}
      </p>
      <p className="timer-cycle">{formatCycle(state, settings.cyclesBeforeLongBreak)}</p>
      <div className="timer-actions">
        {state.phase === PHASES.IDLE && (
          <button type="button" onClick={() => setState((s) => start(s, settings, Date.now()))}>
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

function formatCycle(
  state: { phase: string; cycleCount: number },
  cyclesBeforeLongBreak: number,
): string {
  if (state.phase === PHASES.IDLE) {
    return `Focus session 1 of ${cyclesBeforeLongBreak}`
  }
  if (state.phase === PHASES.FOCUS) {
    return `Focus session ${state.cycleCount + 1} of ${cyclesBeforeLongBreak}`
  }
  return `${state.cycleCount} of ${cyclesBeforeLongBreak} focus sessions completed`
}
