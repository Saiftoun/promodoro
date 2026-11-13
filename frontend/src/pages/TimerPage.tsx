import { useState } from 'react'
import Timer from '../Timer.js'
import SettingsPanel from '../SettingsPanel.js'
import { CLASSIC_PRESET } from '@shared/timer/presets.js'
import type { Settings } from '../timerTypes.js'

// Public solo timer page — unchanged from PROM-16/17/18.
export default function TimerPage() {
  // TEMPORARY TEST VALUES (do not commit): to test a full cycle in about a
  // minute, replace the line below with:
  //   useState<Settings>({ focusMs: 20_000, shortBreakMs: 5_000, longBreakMs: 10_000, cyclesBeforeLongBreak: 2, totalCycles: null })
  const [settings, setSettings] = useState<Settings>(CLASSIC_PRESET)
  const [timerIdle, setTimerIdle] = useState(true)

  return (
    <>
      <h1>FocusRoom</h1>
      <SettingsSummary settings={settings} />
      <SettingsPanel onApply={setSettings} locked={!timerIdle} />
      <Timer settings={settings} onIdleChange={setTimerIdle} />
    </>
  )
}

function SettingsSummary({ settings }: { settings: Settings }) {
  const focus = Math.round(settings.focusMs / 60000)
  const short = Math.round(settings.shortBreakMs / 60000)
  const long = Math.round(settings.longBreakMs / 60000)
  const cycles = settings.cyclesBeforeLongBreak
  const limit = settings.totalCycles
  const limitText = limit
    ? ` — stops after ${limit} focus cycle${limit === 1 ? '' : 's'}`
    : ' — runs until you stop it'
  return (
    <p className="settings-summary" aria-live="polite">
      {focus} min focus, {short} min break, {long} min long break every {cycles}{' '}
      session{cycles === 1 ? '' : 's'}
      {limitText}
    </p>
  )
}
