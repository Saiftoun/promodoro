// Web Audio two-tone cues, generated in code — no audio files.
// The AudioContext is created or resumed inside user click handlers
// (Start / Resume / sound toggle), never on page load, because browsers
// block audio until the page has been interacted with.

let audioContext: AudioContext | null = null

export function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }
  const AudioContextCtor = window.AudioContext
  if (!AudioContextCtor) {
    return null
  }
  if (!audioContext) {
    audioContext = new AudioContextCtor()
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }
  return audioContext
}

function playTone(
  context: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
): void {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  const t0 = context.currentTime + startOffset
  // Small attack and exponential release so the tone does not click.
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(0.18, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(t0)
  oscillator.stop(t0 + duration + 0.05)
}

function isReady(context: AudioContext | null): context is AudioContext {
  return context !== null && context.state === 'running'
}

/**
 * Focus ended and a break starts: rising two-tone (E5 -> A5).
 */
export function playFocusEndsCue(): void {
  if (!isReady(audioContext)) {
    return
  }
  playTone(audioContext, 659.25, 0, 0.22)
  playTone(audioContext, 880, 0.25, 0.3)
}

/**
 * Break ended and focus starts: falling two-tone (A5 -> E5).
 */
export function playBreakEndsCue(): void {
  if (!isReady(audioContext)) {
    return
  }
  playTone(audioContext, 880, 0, 0.22)
  playTone(audioContext, 659.25, 0.25, 0.3)
}
