import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PRESETS,
  CLASSIC_PRESET,
  DEEP_WORK_PRESET,
  validateCustomSettings,
} from './presets.js'

const MIN = 60 * 1000

test('presets have the exact specified values', () => {
  assert.deepStrictEqual(CLASSIC_PRESET, {
    focusMs: 25 * MIN,
    shortBreakMs: 5 * MIN,
    longBreakMs: 15 * MIN,
    cyclesBeforeLongBreak: 4,
  })
  assert.deepStrictEqual(DEEP_WORK_PRESET, {
    focusMs: 50 * MIN,
    shortBreakMs: 10 * MIN,
    longBreakMs: 20 * MIN,
    cyclesBeforeLongBreak: 3,
  })
  assert.deepStrictEqual(PRESETS.classic.settings, CLASSIC_PRESET)
  assert.deepStrictEqual(PRESETS.deepWork.settings, DEEP_WORK_PRESET)
})

test('valid custom input is accepted and converted to milliseconds', () => {
  const result = validateCustomSettings({
    focusMin: 30,
    shortBreakMin: 6,
    longBreakMin: 20,
    cycles: 5,
  })
  assert.strictEqual(result.valid, true)
  assert.deepStrictEqual(result.errors, {})
  assert.deepStrictEqual(result.settings, {
    focusMs: 30 * MIN,
    shortBreakMs: 6 * MIN,
    longBreakMs: 20 * MIN,
    cyclesBeforeLongBreak: 5,
  })
  // Never throws, and never mutates the input
  const input = { focusMin: 10, shortBreakMin: 2, longBreakMin: 5, cycles: 4 }
  const copy = structuredClone(input)
  const r = validateCustomSettings(input)
  assert.strictEqual(r.valid, true)
  assert.deepStrictEqual(input, copy)
})

test('boundary values are accepted (min and max)', () => {
  const min = validateCustomSettings({
    focusMin: 1,
    shortBreakMin: 1,
    longBreakMin: 1,
    cycles: 1,
  })
  assert.strictEqual(min.valid, true)
  assert.deepStrictEqual(min.settings, {
    focusMs: 1 * MIN,
    shortBreakMs: 1 * MIN,
    longBreakMs: 1 * MIN,
    cyclesBeforeLongBreak: 1,
  })

  const max = validateCustomSettings({
    focusMin: 180,
    shortBreakMin: 60,
    longBreakMin: 120,
    cycles: 12,
  })
  assert.strictEqual(max.valid, true)
  assert.deepStrictEqual(max.settings, {
    focusMs: 180 * MIN,
    shortBreakMs: 60 * MIN,
    longBreakMs: 120 * MIN,
    cyclesBeforeLongBreak: 12,
  })
})

test('empty values are rejected for every field', () => {
  for (const field of ['focusMin', 'shortBreakMin', 'longBreakMin', 'cycles']) {
    for (const empty of ['', '   ', undefined, null]) {
      const input = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, cycles: 4 }
      input[field] = empty
      const result = validateCustomSettings(input)
      assert.strictEqual(result.valid, false, `${field} = ${JSON.stringify(empty)}`)
      assert.match(result.errors[field], /whole number/)
      assert.strictEqual(result.settings, null)
    }
  }
})

test('zero is rejected for every field', () => {
  for (const field of ['focusMin', 'shortBreakMin', 'longBreakMin', 'cycles']) {
    const input = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, cycles: 4 }
    input[field] = 0
    const result = validateCustomSettings(input)
    assert.strictEqual(result.valid, false, field)
    assert.match(result.errors[field], /cannot be 0/)
  }
})

test('negative values are rejected for every field', () => {
  for (const field of ['focusMin', 'shortBreakMin', 'longBreakMin', 'cycles']) {
    const input = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, cycles: 4 }
    input[field] = -5
    const result = validateCustomSettings(input)
    assert.strictEqual(result.valid, false, field)
    assert.match(result.errors[field], /cannot be negative/)
  }
})

test('decimal values are rejected for every field', () => {
  for (const field of ['focusMin', 'shortBreakMin', 'longBreakMin', 'cycles']) {
    for (const decimal of [2.5, '2.5']) {
      const input = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, cycles: 4 }
      input[field] = decimal
      const result = validateCustomSettings(input)
      assert.strictEqual(result.valid, false, `${field} = ${decimal}`)
      assert.match(result.errors[field], /whole number/)
    }
  }
})

test('text values are rejected for every field', () => {
  for (const field of ['focusMin', 'shortBreakMin', 'longBreakMin', 'cycles']) {
    const input = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, cycles: 4 }
    input[field] = 'twenty five'
    const result = validateCustomSettings(input)
    assert.strictEqual(result.valid, false, field)
    assert.match(result.errors[field], /whole number/)
  }
  // Other types are rejected too
  for (const field of ['focusMin', 'shortBreakMin', 'longBreakMin', 'cycles']) {
    const input = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, cycles: 4 }
    input[field] = {}
    const result = validateCustomSettings(input)
    assert.strictEqual(result.valid, false, field)
  }
})

test('too large values are rejected per field', () => {
  const cases = [
    ['focusMin', 181, 180],
    ['shortBreakMin', 61, 60],
    ['longBreakMin', 121, 120],
    ['cycles', 13, 12],
  ]
  for (const [field, tooLarge, max] of cases) {
    const input = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, cycles: 4 }
    input[field] = tooLarge
    const result = validateCustomSettings(input)
    assert.strictEqual(result.valid, false, field)
    assert.match(result.errors[field], new RegExp(`from 1 to ${max}`))
  }
  // Just below the limit is fine
  const ok = validateCustomSettings({
    focusMin: 180,
    shortBreakMin: 60,
    longBreakMin: 120,
    cycles: 12,
  })
  assert.strictEqual(ok.valid, true)
})

test('missing input object never throws and rejects everything', () => {
  const result = validateCustomSettings(undefined)
  assert.strictEqual(result.valid, false)
  assert.strictEqual(result.settings, null)
  assert.deepStrictEqual(Object.keys(result.errors).sort(), [
    'cycles',
    'focusMin',
    'longBreakMin',
    'shortBreakMin',
  ])
})

test('each error message names what is allowed', () => {
  const result = validateCustomSettings({ focusMin: 0 })
  assert.strictEqual(
    result.errors.focusMin,
    'Focus cannot be 0: it must be a whole number from 1 to 180.',
  )
  const result2 = validateCustomSettings({ focusMin: 200 })
  assert.strictEqual(
    result2.errors.focusMin,
    'Focus must be a whole number from 1 to 180 minutes.',
  )
  const result3 = validateCustomSettings({ cycles: 'abc' })
  assert.strictEqual(
    result3.errors.cycles,
    'Focus periods before a long break must be a whole number from 1 to 12 minutes.',
  )
})
