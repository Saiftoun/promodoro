# Timer state machine and presets (PROM-15, PROM-17)

Plain ES modules, zero dependencies. The same logic can run in the frontend and
later on the backend (the authority for the timer). No presets, no UI, no
sounds, no network code — only the phase state machine.

## State object

```js
{
  phase: 'idle',            // 'idle' | 'focus' | 'short_break' | 'long_break'
  phaseStartedAt: null,     // clock time (ms) when the current phase started
  phaseDuration: null,      // planned duration of the current phase (ms)
  paused: false,            // true while paused
  remainingWhenPaused: null,// ms left in the phase at the moment it was paused
  cycleCount: 0,            // completed focus periods since the last long break
}
```

Created by `createIdleState()`.

## Settings object

```js
{
  focusMs: 25 * 60 * 1000,
  shortBreakMs: 5 * 60 * 1000,
  longBreakMs: 15 * 60 * 1000,
  cyclesBeforeLongBreak: 4,
}
```

Invalid settings (non-positive durations, `cyclesBeforeLongBreak` below 1 or
non-integer) make the functions throw a clear `Error`.

## Time rule (important)

**No function reads the clock.** Every function receives the current time as
`now` in milliseconds. This keeps the logic pure and testable, and lets the
server clock (the authority) be plugged in later. Never call `Date.now()`
around this module.

## Transition rules

- `start`: idle -> focus (only from idle).
- Focus end (expiry or skip) -> short break, except after every
  `cyclesBeforeLongBreak` completed focus periods -> long break.
- Any break end -> focus.
- When a long break ends, `cycleCount` returns to 0.
- `pause` stores the remaining time in `remainingWhenPaused`; `resume`
  continues from it (the phase end moves accordingly).
- `advanceIfExpired` loops until the state is current (handles several phases
  having expired, e.g. a server that was offline) and carries the exact phase
  boundaries over; it does nothing while paused and nothing while idle.

## Presets and custom settings (PROM-17)

`presets.js` (same rules: no dependencies, no clock reads, pure) provides:

- `PRESETS` — named presets as plain settings objects:
  - `classic` / `CLASSIC_PRESET`: 25 min focus, 5 min short break, 15 min long
    break, long break after 4 focus periods.
  - `deepWork` / `DEEP_WORK_PRESET`: 50 min focus, 10 min short break, 20 min
    long break, long break after 3 focus periods.
- `CUSTOM_LIMITS` — allowed ranges in minutes: focus 1–180, short break 1–60,
  long break 1–120, focus periods before a long break 1–12.
- `validateCustomSettings(input)` — validates custom values typed by a user in
  **minutes** (`focusMin`, `shortBreakMin`, `longBreakMin`, `cycles`).
  Never throws. Returns `{ valid, settings, errors }`:
  - `valid: false` → `settings` is `null` and `errors` holds one clear message
    per invalid field (empty, zero, negative, decimal, text and out-of-range
    values are all rejected; the message says what is allowed).
  - `valid: true` → `settings` is the validated input converted to the
    milliseconds settings shape above, and `errors` is empty.

## API

| Function | Description |
| --- | --- |
| `createIdleState()` | Initial idle state. |
| `normalizeSettings(settings)` | Validates a settings object, returns a normalized copy or throws. |
| `start(state, settings, now)` | idle -> focus. |
| `pause(state, now)` / `resume(state, now)` | Pause stores the remaining time; resume continues from it. Safe no-ops when already in that state. |
| `skip(state, settings, now)` | Move to the next phase immediately (works while paused; clears the pause). Throws from idle. |
| `reset()` | Back to idle, `cycleCount` 0. |
| `getRemaining(state, now)` | ms left in the phase, never below 0, correct while paused. |
| `advanceIfExpired(state, settings, now)` | Move to the next phase if the current one has ended; loops until current. |

All functions are pure: they return a NEW state and never mutate the input.

## Usage example

```js
import {
  createIdleState, start, getRemaining, advanceIfExpired,
} from './timer/timer.js'

const settings = {
  focusMs: 25 * 60 * 1000,
  shortBreakMs: 5 * 60 * 1000,
  longBreakMs: 15 * 60 * 1000,
  cyclesBeforeLongBreak: 4,
}

const t0 = 1_000_000 // any clock value (ms); the caller owns the clock
let state = start(createIdleState(), settings, t0)

// later, on every tick or request:
state = advanceIfExpired(state, settings, Date.now())
const remaining = getRemaining(state, Date.now())
```

## Run the tests

```powershell
cd shared
npm test
```

Uses Node's built-in test runner (`node --test`) — no extra dependencies.
Covers the state machine (`timer.test.js`) and the presets/custom validation
(`presets.test.js`).
