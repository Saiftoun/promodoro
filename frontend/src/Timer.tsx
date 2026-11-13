import { useEffect, useRef, useState } from 'react'
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
import {
  ensureAudioContext,
  playFocusEndsCue,
  playBreakEndsCue,
} from './sound.js'
import {
  getNotificationPermission,
  requestNotificationPermission,
  showPhaseChangeNotification,
  notificationsSupported,
} from './notifications.js'

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
  const [soundOn, setSoundOn] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationPermission(),
  )
  const previousPhaseRef = useRef<string>(state.phase)

  const running = state.phase !== PHASES.IDLE
  const remaining = getRemaining(state, Date.now())
  const timeText = running ? formatMs(remaining) : formatMs(settings.focusMs)
  const phaseLabel = PHASE_LABELS[state.phase]

  const focusMinutes = Math.round(settings.focusMs / 60000)
  const shortBreakMinutes = Math.round(settings.shortBreakMs / 60000)
  const longBreakMinutes = Math.round(settings.longBreakMs / 60000)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setState((current) => advanceIfExpired(current, settings, Date.now()))
    }, 250)
    return () => clearInterval(intervalId)
  }, [settings])

  useEffect(() => {
    onIdleChange(state.phase === PHASES.IDLE)
  }, [state.phase, onIdleChange])

  // Phase change detection: compare with the previous phase in a ref.
  // Sounds and notifications fire ONLY for automatic changes between two
  // non-idle phases (the timer ran out) — never on Start, Pause, Resume or
  // Reset (those go through idle or keep the phase). The effect runs once per
  // phase change and updates the ref, so it cannot fire twice for the same
  // change (including React StrictMode double-invocation).
  useEffect(() => {
    const previousPhase = previousPhaseRef.current
    previousPhaseRef.current = state.phase
    const automaticChange =
      previousPhase !== state.phase &&
      previousPhase !== PHASES.IDLE &&
      state.phase !== PHASES.IDLE
    if (!automaticChange) {
      return
    }
    if (soundOn) {
      if (previousPhase === PHASES.FOCUS) {
        playFocusEndsCue()
      } else {
        playBreakEndsCue()
      }
    }
    if (notificationPermission === 'granted') {
      if (previousPhase === PHASES.FOCUS) {
        const isLong = state.phase === PHASES.LONG_BREAK
        showPhaseChangeNotification(
          'Focus finished',
          `Time for a ${isLong ? longBreakMinutes : shortBreakMinutes} minute ${isLong ? 'long ' : ''}break.`,
        )
      } else {
        showPhaseChangeNotification(
          'Break finished',
          `Time to focus for ${focusMinutes} minutes.`,
        )
      }
    }
  }, [
    state.phase,
    soundOn,
    notificationPermission,
    focusMinutes,
    shortBreakMinutes,
    longBreakMinutes,
  ])

  useEffect(() => {
    document.title = running ? `${timeText} ${phaseLabel}` : 'FocusRoom'
  }, [timeText, phaseLabel, running])

  function handleStart() {
    ensureAudioContext()
    setState((s) => start(s, settings, Date.now()))
  }

  function handleResume() {
    ensureAudioContext()
    setState((s) => resume(s, Date.now()))
  }

  function toggleSound() {
    if (!soundOn) {
      ensureAudioContext()
    }
    setSoundOn((current) => !current)
  }

  async function enableNotifications() {
    setNotificationPermission(await requestNotificationPermission())
  }

  return (
    <section className="timer" aria-label="Pomodoro timer">
      <p className="timer-phase">{phaseLabel}</p>
      <p className="timer-time" role="timer" aria-live="off">
        {timeText}
      </p>
      <p className="timer-cycle">
        {formatCycle(state, settings.cyclesBeforeLongBreak)}
      </p>
      <div className="timer-actions">
        {state.phase === PHASES.IDLE && (
          <button type="button" onClick={handleStart}>
            Start
          </button>
        )}
        {running && !state.paused && (
          <button type="button" onClick={() => setState((s) => pause(s, Date.now()))}>
            Pause
          </button>
        )}
        {running && state.paused && (
          <button type="button" onClick={handleResume}>
            Resume
          </button>
        )}
        {running && (
          <button type="button" onClick={() => setState(reset())}>
            Reset
          </button>
        )}
      </div>
      <div className="timer-extras">
        <button
          type="button"
          className="timer-toggle"
          aria-pressed={soundOn}
          onClick={toggleSound}
        >
          Sound: {soundOn ? 'on' : 'off'}
        </button>
        {notificationsSupported() && notificationPermission === 'default' && (
          <button type="button" className="timer-toggle" onClick={enableNotifications}>
            Enable notifications
          </button>
        )}
      </div>
      <TimerNotes notificationPermission={notificationPermission} />
    </section>
  )
}

function TimerNotes({
  notificationPermission,
}: {
  notificationPermission: NotificationPermission | 'unsupported'
}) {
  if (notificationPermission === 'granted') {
    return <p className="timer-note">Notifications are enabled.</p>
  }
  if (notificationPermission === 'denied') {
    return (
      <p className="timer-note">
        Notifications are blocked for this site — you can allow them in your
        browser settings. Sounds keep working.
      </p>
    )
  }
  if (notificationPermission === 'unsupported') {
    return (
      <p className="timer-note">
        This browser does not support notifications. Sounds keep working.
      </p>
    )
  }
  return null
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
