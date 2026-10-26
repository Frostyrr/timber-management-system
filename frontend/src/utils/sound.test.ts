// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sound } from './sound'

describe('SoundEffects', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to unmuted and allows toggling mute state', () => {
    expect(sound.isMuted()).toBe(false)

    sound.setMuted(true)
    expect(sound.isMuted()).toBe(true)
    expect(localStorage.getItem('timber_sound_enabled')).toBe('false')

    sound.setMuted(false)
    expect(sound.isMuted()).toBe(false)
    expect(localStorage.getItem('timber_sound_enabled')).toBe('true')
  })

  it('does not throw when AudioContext is unsupported or null', () => {
    // When AudioContext is undefined, play should fail silently without throwing
    expect(() => sound.play('success')).not.toThrow()
    expect(() => sound.play('warning')).not.toThrow()
    expect(() => sound.play('error')).not.toThrow()
    expect(() => sound.play('info')).not.toThrow()
  })

  it('synthesizes audio when AudioContext is available', () => {
    const mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }

    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }

    class MockAudioContext {
      state = 'running'
      currentTime = 0
      destination = {}
      createOscillator = vi.fn(() => ({ ...mockOscillator }))
      createGain = vi.fn(() => ({ ...mockGain }))
      resume = vi.fn().mockResolvedValue(undefined)
    }

    // @ts-expect-error Mocking window AudioContext
    window.AudioContext = MockAudioContext

    sound.setMuted(false)
    expect(() => sound.play('success')).not.toThrow()
    expect(() => sound.play('warning')).not.toThrow()
    expect(() => sound.play('error')).not.toThrow()
    expect(() => sound.play('info')).not.toThrow()
  })

  it('does not play when muted', () => {
    class MockAudioContext {
      constructor() {
        throw new Error('Should not be instantiated when muted')
      }
    }
    // @ts-expect-error Mocking window AudioContext
    window.AudioContext = MockAudioContext

    sound.setMuted(true)
    expect(() => sound.play('success')).not.toThrow()
  })
})
