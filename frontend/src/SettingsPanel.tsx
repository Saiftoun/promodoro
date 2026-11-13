import { useState } from 'react'
import {
  PRESETS,
  CUSTOM_LIMITS,
  validateCustomSettings,
} from '@shared/timer/presets.js'
import type { Settings } from './timerTypes.js'

type PresetChoice = 'classic' | 'deepWork' | 'custom'

interface CustomInput {
  focusMin: string
  shortBreakMin: string
  longBreakMin: string
  cycles: string
}

const EMPTY_CUSTOM_INPUT: CustomInput = {
  focusMin: '',
  shortBreakMin: '',
  longBreakMin: '',
  cycles: '',
}

interface SettingsPanelProps {
  onApply: (settings: Settings) => void
  locked: boolean
}

export default function SettingsPanel({ onApply, locked }: SettingsPanelProps) {
  const [choice, setChoice] = useState<PresetChoice>('classic')
  const [custom, setCustom] = useState<CustomInput>(EMPTY_CUSTOM_INPUT)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validation = validateCustomSettings(custom)

  function selectPreset(next: PresetChoice) {
    setChoice(next)
    if (next === 'classic') {
      onApply(PRESETS.classic.settings)
    } else if (next === 'deepWork') {
      onApply(PRESETS.deepWork.settings)
    }
  }

  function updateCustom(field: keyof CustomInput, value: string) {
    setCustom((current) => ({ ...current, [field]: value }))
    setTouched((current) => ({ ...current, [field]: true }))
  }

  function applyCustom() {
    if (!validation.valid) {
      setTouched({ focusMin: true, shortBreakMin: true, longBreakMin: true, cycles: true })
      return
    }
    onApply(validation.settings)
  }

  return (
    <fieldset className="settings" disabled={locked}>
      <legend>Timer settings</legend>
      {locked && (
        <p className="settings-note">
          The timer is running — reset it to change the settings.
        </p>
      )}
      <div className="settings-choices">
        <label>
          <input
            type="radio"
            name="preset"
            value="classic"
            checked={choice === 'classic'}
            onChange={() => selectPreset('classic')}
          />
          Classic 25/5
        </label>
        <label>
          <input
            type="radio"
            name="preset"
            value="deepWork"
            checked={choice === 'deepWork'}
            onChange={() => selectPreset('deepWork')}
          />
          Deep work 50/10
        </label>
        <label>
          <input
            type="radio"
            name="preset"
            value="custom"
            checked={choice === 'custom'}
            onChange={() => setChoice('custom')}
          />
          Custom
        </label>
      </div>

      {choice === 'custom' && (
        <div className="settings-custom">
          {(
            [
              ['focusMin', 'Focus (minutes)'],
              ['shortBreakMin', 'Short break (minutes)'],
              ['longBreakMin', 'Long break (minutes)'],
              ['cycles', 'Focus periods before a long break'],
            ] as [keyof CustomInput, string][]
          ).map(([field, label]) => (
            <div className="settings-field" key={field}>
              <label htmlFor={`custom-${field}`}>{label}</label>
              <input
                id={`custom-${field}`}
                type="number"
                inputMode="numeric"
                min={CUSTOM_LIMITS[field].min}
                max={CUSTOM_LIMITS[field].max}
                step={1}
                value={custom[field]}
                onChange={(event) => updateCustom(field, event.target.value)}
                aria-invalid={showError(field, custom, touched)}
                aria-describedby={showError(field, custom, touched) ? `error-${field}` : undefined}
              />
              <p
                id={`error-${field}`}
                className="settings-error"
                aria-live="polite"
              >
                {showError(field, custom, touched) ? validation.errors[field] : ''}
              </p>
            </div>
          ))}
          <button type="button" onClick={applyCustom} disabled={!validation.valid}>
            Apply
          </button>
        </div>
      )}
    </fieldset>
  )
}

function showError(
  field: keyof CustomInput,
  custom: CustomInput,
  touched: Record<string, boolean>,
): boolean {
  return touched[field] === true && custom[field].trim() !== ''
}
