/**
 * Web Audio API synthesizer for tactile UI sound effects.
 * Synthesizes harmonic, organic earcons with zero external audio assets.
 */
class SoundEffects {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        try {
          this.ctx = new AudioContextClass()
        } catch {
          return null
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public isMuted(): boolean {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem('timber_sound_enabled') === 'false'
    } catch {
      return false
    }
  }

  public setMuted(muted: boolean): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('timber_sound_enabled', muted ? 'false' : 'true')
    } catch {
      // Ignore localStorage restrictions
    }
  }

  /**
   * Plays a delicate, harmonic earcon tailored to the feedback type.
   */
  public play(type: 'success' | 'warning' | 'error' | 'info' = 'success'): void {
    if (this.isMuted()) return
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime

      switch (type) {
        case 'success': {
          // Ascending two-tone harmonic chord: D5 (587.33Hz) -> A5 (880.00Hz)
          // Soft sine waves with exponential decay (Linear/Apple style)
          const osc1 = ctx.createOscillator()
          const osc2 = ctx.createOscillator()
          const gain1 = ctx.createGain()
          const gain2 = ctx.createGain()
          const master = ctx.createGain()

          osc1.type = 'sine'
          osc1.frequency.setValueAtTime(587.33, now)

          osc2.type = 'sine'
          osc2.frequency.setValueAtTime(880.0, now + 0.065)

          // Gain 1: 5ms attack, 120ms decay
          gain1.gain.setValueAtTime(0, now)
          gain1.gain.linearRampToValueAtTime(0.08, now + 0.005)
          gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

          // Gain 2: starts slightly after note 1, 180ms decay
          gain2.gain.setValueAtTime(0, now)
          gain2.gain.setValueAtTime(0, now + 0.065)
          gain2.gain.linearRampToValueAtTime(0.09, now + 0.07)
          gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)

          master.gain.setValueAtTime(1, now)

          osc1.connect(gain1)
          osc2.connect(gain2)
          gain1.connect(master)
          gain2.connect(master)
          master.connect(ctx.destination)

          osc1.start(now)
          osc1.stop(now + 0.13)
          osc2.start(now + 0.065)
          osc2.stop(now + 0.23)
          break
        }
        case 'warning': {
          // Warm double-tap chime: 440Hz -> 415Hz
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'sine'
          osc.frequency.setValueAtTime(440, now)
          osc.frequency.setValueAtTime(415.3, now + 0.08)

          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(0.07, now + 0.005)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07)
          gain.gain.setValueAtTime(0, now + 0.08)
          gain.gain.linearRampToValueAtTime(0.06, now + 0.085)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(now)
          osc.stop(now + 0.19)
          break
        }
        case 'error': {
          // Subtle low double thud: 220Hz -> 146Hz
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'triangle'
          osc.frequency.setValueAtTime(220, now)
          osc.frequency.exponentialRampToValueAtTime(146.8, now + 0.14)

          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(0.07, now + 0.005)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(now)
          osc.stop(now + 0.17)
          break
        }
        case 'info':
        default: {
          // Single delicate crystal drop: E5 (659.25Hz)
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'sine'
          osc.frequency.setValueAtTime(659.25, now)

          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(0.06, now + 0.005)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(now)
          osc.stop(now + 0.15)
          break
        }
      }
    } catch {
      // AudioContext unavailable, blocked by policy or running in non-browser context
    }
  }
}

export const sound = new SoundEffects()
