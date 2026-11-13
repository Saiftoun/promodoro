export const PRESETS = {
  classic: {
    label: 'Classic 25/5',
    settings: {
      focusMs: 25 * 60 * 1000,
      shortBreakMs: 5 * 60 * 1000,
      longBreakMs: 15 * 60 * 1000,
      cyclesBeforeLongBreak: 4,
      totalCycles: null,
    },
  },
  deepWork: {
    label: 'Deep work 50/10',
    settings: {
      focusMs: 50 * 60 * 1000,
      shortBreakMs: 10 * 60 * 1000,
      longBreakMs: 20 * 60 * 1000,
      cyclesBeforeLongBreak: 3,
      totalCycles: null,
    },
  },
}

export const CLASSIC_PRESET = PRESETS.classic.settings
export const DEEP_WORK_PRESET = PRESETS.deepWork.settings

// Allowed ranges, in minutes, for custom durations typed by a user.
// totalCycles is a count (not minutes) and may be left empty = no limit.
export const CUSTOM_LIMITS = {
  focusMin: { min: 1, max: 180, label: 'Focus' },
  shortBreakMin: { min: 1, max: 60, label: 'Short break' },
  longBreakMin: { min: 1, max: 120, label: 'Long break' },
  cycles: { min: 1, max: 12, label: 'Focus periods before a long break' },
  totalCycles: {
    min: 1,
    max: 50,
    label: 'Focus cycles before stopping',
    allowEmpty: true,
  },
}

// Fields of the custom input mapped to their settings field, ms multiplier
// and whether the field may be left empty (empty = null = no limit).
const CUSTOM_FIELDS = [
  ['focusMin', 'focusMs', 60 * 1000, false],
  ['shortBreakMin', 'shortBreakMs', 60 * 1000, false],
  ['longBreakMin', 'longBreakMs', 60 * 1000, false],
  ['cycles', 'cyclesBeforeLongBreak', 1, false],
  ['totalCycles', 'totalCycles', 1, true],
]

/**
 * Validate custom settings typed by a user (values in MINUTES, except
 * totalCycles which is a count). Never throws: returns { valid, settings,
 * errors } where errors holds one clear message per invalid field. Valid
 * values are converted to the settings shape in milliseconds:
 * { focusMs, shortBreakMs, longBreakMs, cyclesBeforeLongBreak, totalCycles }.
 * totalCycles may be empty (or 0): both mean null = no limit, the timer
 * repeats forever.
 */
export function validateCustomSettings(input) {
  const errors = {}
  const values = {}

  for (const [field, , , allowEmpty] of CUSTOM_FIELDS) {
    const limits = CUSTOM_LIMITS[field]
    const raw = input ? input[field] : undefined
    const isEmpty =
      raw === undefined ||
      raw === null ||
      (typeof raw === 'string' && raw.trim() === '')

    if (isEmpty && allowEmpty) {
      values[field] = null
      continue
    }

    // totalCycles: 0 is accepted here and converted to null below.
    const value = toWholeNumber(
      raw,
      field === 'totalCycles' ? { ...limits, min: 0 } : limits,
    )

    if (value === null) {
      errors[field] = buildErrorMessage(raw, limits)
    } else if (field === 'totalCycles' && value === 0) {
      // 0 explicitly means "no limit".
      values[field] = null
    } else {
      values[field] = value
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, settings: null, errors }
  }

  return {
    valid: true,
    settings: {
      focusMs: values.focusMin * 60 * 1000,
      shortBreakMs: values.shortBreakMin * 60 * 1000,
      longBreakMs: values.longBreakMin * 60 * 1000,
      cyclesBeforeLongBreak: values.cycles,
      totalCycles: values.totalCycles,
    },
    errors: {},
  }
}

/**
 * Return the value as a whole number inside the allowed range, or null if the
 * raw input is empty, not a number, a decimal, zero, negative or out of range.
 */
function toWholeNumber(raw, limits = null) {
  if (raw === undefined || raw === null) {
    return null
  }
  if (typeof raw !== 'number' && typeof raw !== 'string') {
    return null
  }
  if (typeof raw === 'string' && raw.trim() === '') {
    return null
  }
  const value = Number(raw)
  if (Number.isNaN(value) || !Number.isInteger(value)) {
    return null
  }
  if (limits && (value < limits.min || value > limits.max)) {
    return null
  }
  return value
}

function buildErrorMessage(raw, limits) {
  if (limits.allowEmpty) {
    return `${limits.label} must be empty (no limit) or a whole number from ${limits.min} to ${limits.max}.`
  }
  const value = toWholeNumber(raw)
  if (value === 0) {
    return `${limits.label} cannot be 0: it must be a whole number from ${limits.min} to ${limits.max}.`
  }
  if (value !== null && value < 0) {
    return `${limits.label} cannot be negative: it must be a whole number from ${limits.min} to ${limits.max}.`
  }
  if (
    value !== null &&
    typeof raw === 'number' &&
    (value < limits.min || value > limits.max)
  ) {
    return `${limits.label} must be a whole number from ${limits.min} to ${limits.max} minutes.`
  }
  return `${limits.label} must be a whole number from ${limits.min} to ${limits.max} minutes.`
}
