export interface Settings {
  focusMs: number
  shortBreakMs: number
  longBreakMs: number
  cyclesBeforeLongBreak: number
  // Total focus cycles before the timer stops on its own.
  // null = no limit: the cycle repeats forever.
  totalCycles: number | null
}
