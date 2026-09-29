/**
 * The sound packs (DESIGN_SYSTEM §7): the same six cues in nine voices, each drawn with WebAudio
 * from oscillators, filtered noise, a feedback echo, and a bit crusher. No samples. A pack is a
 * table of cues: each gets the voices, the time to start at, its level (0..1, from the events it
 * stands for), and the bot whose death it sounds. The engine picks the table the settings name.
 *
 * The frequent cues (tick, write, death) stay under about 50 ms, or they smear at the fast
 * speeds; a bot's death and the victory may run to a second and a half.
 */
import type { SoundCue, SoundPack } from '../../store/settings'

/** Each hue's pitch step, semitones over E4: a pentatonic climb, so any two deaths agree. */
const BOT_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26] as const

/** Where bot `bot`'s death tone starts, Hz. Bot 13 on starts where bot 1 does, as its hue wraps. */
export function botPitch(bot: number): number {
  return 329.63 * 2 ** ((BOT_STEPS[bot % BOT_STEPS.length] ?? 0) / 12)
}

/** `hz` moved `semitones` up (or down, below 0). */
function step(hz: number, semitones: number): number {
  return hz * 2 ** (semitones / 12)
}

/** Where a gain starts and ends: exponential ramps cannot reach 0. */
const SILENT = 0.0001

/** A filter's cutoff over a sound: from `from` Hz, gliding to `to` by its end. */
export interface Sweep {
  readonly from: number
  readonly to?: number | undefined
  readonly q?: number | undefined
}

export interface Tone {
  readonly type: OscillatorType
  /** Hz at the start, and at the end (default: the start): an exponential glide between. */
  readonly from: number
  readonly to?: number | undefined
  /** Seconds. */
  readonly length: number
  /** The envelope's peak, 0..1, before the master gain. */
  readonly peak: number
  /** Seconds to the peak. Default 4 ms. */
  readonly attack?: number | undefined
  /** A low-pass filter on the oscillator. */
  readonly lowpass?: Sweep | undefined
  /** Where it goes: a bus (`echo`, `crush`). Default: the master. */
  readonly into?: AudioNode | undefined
}

export interface Noise extends Sweep {
  /** The filter that shapes the white noise. */
  readonly filter: BiquadFilterType
  readonly length: number
  readonly peak: number
  /** Seconds to the peak. Default 1 ms. */
  readonly attack?: number | undefined
  readonly into?: AudioNode | undefined
}

/** A percussive envelope on `gain`: up to `peak` in `attack` s, down again by `length` s. */
function shape(gain: AudioParam, at: number, peak: number, attack: number, length: number): void {
  gain.setValueAtTime(SILENT, at)
  gain.exponentialRampToValueAtTime(Math.max(SILENT, peak), at + attack)
  gain.exponentialRampToValueAtTime(SILENT, at + length)
}

/**
 * The instruments of one AudioContext, into its master gain: a tone, a burst of noise, and the
 * shared buses (an echo, a crusher), each made once and kept for the context's life.
 */
export class Voices {
  private noiseBuffer: AudioBuffer | null = null
  private readonly buses = new Map<string, AudioNode>()

  constructor(
    readonly context: AudioContext,
    readonly out: AudioNode,
  ) {}

  /** One oscillator through its own envelope, from `at` (context seconds). */
  tone(at: number, t: Tone): void {
    const { context } = this
    const oscillator = context.createOscillator()
    oscillator.type = t.type
    oscillator.frequency.setValueAtTime(t.from, at)
    const to = t.to ?? t.from
    if (to !== t.from) oscillator.frequency.exponentialRampToValueAtTime(to, at + t.length)
    const envelope = context.createGain()
    shape(envelope.gain, at, t.peak, t.attack ?? 0.004, t.length)
    const head = t.lowpass
      ? oscillator.connect(this.filter(at, 'lowpass', t.lowpass, t.length))
      : oscillator
    head.connect(envelope).connect(t.into ?? this.out)
    oscillator.start(at)
    oscillator.stop(at + t.length + 0.02)
  }

  /** A burst of filtered white noise, from `at`. */
  noise(at: number, n: Noise): void {
    const { context } = this
    const source = context.createBufferSource()
    source.buffer = this.whiteNoise()
    source.loop = true
    const envelope = context.createGain()
    shape(envelope.gain, at, n.peak, n.attack ?? 0.001, n.length)
    source
      .connect(this.filter(at, n.filter, n, n.length))
      .connect(envelope)
      .connect(n.into ?? this.out)
    source.start(at)
    source.stop(at + n.length + 0.02)
  }

  /** A feedback echo into the master, dry and wet: `time` s apart, each `feedback` of the last. */
  echo(time: number, feedback: number, wet: number): AudioNode {
    return this.bus(`echo:${time}:${feedback}:${wet}`, () => {
      const { context } = this
      const input = context.createGain()
      const delay = context.createDelay(1)
      delay.delayTime.value = time
      const loop = context.createGain()
      loop.gain.value = feedback
      const send = context.createGain()
      send.gain.value = wet
      input.connect(this.out)
      input.connect(delay).connect(loop).connect(delay)
      delay.connect(send).connect(this.out)
      return input
    })
  }

  /** A bit crusher into the master: the signal, boosted, rounded to `steps` levels a side. */
  crush(steps: number): AudioNode {
    return this.bus(`crush:${steps}`, () => {
      const { context } = this
      const input = context.createGain()
      input.gain.value = 3
      const shaper = context.createWaveShaper()
      const curve = new Float32Array(1024)
      for (let i = 0; i < curve.length; i++) {
        curve[i] = Math.round(((2 * i) / (curve.length - 1) - 1) * steps) / steps
      }
      shaper.curve = curve
      const output = context.createGain()
      output.gain.value = 1 / 3
      input.connect(shaper).connect(output).connect(this.out)
      return input
    })
  }

  private bus(key: string, make: () => AudioNode): AudioNode {
    let node = this.buses.get(key)
    if (node === undefined) {
      node = make()
      this.buses.set(key, node)
    }
    return node
  }

  private filter(at: number, type: BiquadFilterType, sweep: Sweep, length: number) {
    const node = this.context.createBiquadFilter()
    node.type = type
    node.frequency.setValueAtTime(sweep.from, at)
    if (sweep.to !== undefined && sweep.to !== sweep.from) {
      node.frequency.exponentialRampToValueAtTime(sweep.to, at + length)
    }
    node.Q.value = sweep.q ?? 1
    return node
  }

  /** A second of white noise, made once: every burst loops a piece of it. */
  private whiteNoise(): AudioBuffer {
    if (this.noiseBuffer === null) {
      const { context } = this
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      this.noiseBuffer = buffer
    }
    return this.noiseBuffer
  }
}

/** A cue in a pack: the voices, the start (context seconds), its level (0..1), and the bot. */
export type CueSynth = (v: Voices, at: number, level: number, bot: number) => void

export interface PackSpec {
  /** What the settings page says it sounds like. */
  readonly hint: string
  readonly cues: Readonly<Record<SoundCue, CueSynth>>
}

/** Notes one after another, `gap` s apart: each `length` s, the last `last` s. */
function run(
  v: Voices,
  at: number,
  notes: readonly number[],
  gap: number,
  voice: Omit<Tone, 'from' | 'to' | 'length'> & { length: number; last?: number },
): void {
  notes.forEach((from, i) => {
    const length = i === notes.length - 1 ? (voice.last ?? voice.length) : voice.length
    v.tone(at + i * gap, { ...voice, from, length })
  })
}

/** A bell: a sine and its inharmonic partials, struck at `at`. */
function bell(v: Voices, at: number, hz: number, peak: number, length: number, into?: AudioNode) {
  const partials = [
    [1, 1, 1],
    [2.76, 0.4, 0.6],
    [5.4, 0.2, 0.3],
  ] as const
  for (const [ratio, gain, decay] of partials) {
    v.tone(at, {
      type: 'sine',
      from: hz * ratio,
      length: length * decay,
      peak: peak * gain,
      attack: 0.002,
      into,
    })
  }
}

const C5 = 523.25

/** The first, and the plainest: soft triangle blips. */
const classic: PackSpec = {
  hint: 'soft triangle blips, the original',
  cues: {
    tick: (v, at) =>
      v.tone(at, { type: 'triangle', from: 1800, to: 1400, length: 0.025, peak: 0.2 }),
    write: (v, at, level) =>
      v.noise(at, {
        filter: 'bandpass',
        from: 3200,
        q: 1.2,
        length: 0.018,
        peak: 0.1 + 0.25 * level,
      }),
    death: (v, at, level) =>
      v.tone(at, {
        type: 'triangle',
        from: 160,
        to: 52,
        length: 0.22,
        peak: 0.45 + 0.25 * level,
        attack: 0.003,
      }),
    botDeath: (v, at, _level, bot) => {
      const from = botPitch(bot)
      v.tone(at, { type: 'triangle', from, to: from / 4, length: 0.7, peak: 0.35 })
    },
    victory: (v, at) =>
      run(v, at, [440, 659.26, 880], 0.12, {
        type: 'triangle',
        length: 0.14,
        last: 0.45,
        peak: 0.3,
      }),
    click: (v, at) =>
      v.tone(at, {
        type: 'triangle',
        from: 1320,
        to: 990,
        length: 0.035,
        peak: 0.2,
        attack: 0.001,
      }),
  },
}

/** A 1986 cartridge: square waves and the noise channel. */
const chip: PackSpec = {
  hint: 'square waves and a noise channel, a 1986 cartridge',
  cues: {
    tick: (v, at) =>
      v.tone(at, { type: 'square', from: 1760, length: 0.018, peak: 0.07, attack: 0.001 }),
    write: (v, at, level) =>
      v.noise(at, { filter: 'highpass', from: 7000, length: 0.02, peak: 0.06 + 0.14 * level }),
    death: (v, at, level) => {
      v.noise(at, { filter: 'lowpass', from: 1800, to: 200, length: 0.18, peak: 0.3 + 0.2 * level })
      v.tone(at, { type: 'square', from: 110, to: 55, length: 0.12, peak: 0.07, attack: 0.001 })
    },
    botDeath: (v, at, _level, bot) => {
      const top = botPitch(bot)
      const notes = [0, -3, -5, -8, -12, -15].map((s) => step(top, s))
      run(v, at, notes, 0.07, {
        type: 'square',
        length: 0.065,
        last: 0.22,
        peak: 0.08,
        attack: 0.001,
      })
    },
    victory: (v, at) => {
      const notes = [0, 4, 7, 12, 16, 19].map((s) => step(C5, s))
      run(v, at, notes, 0.055, { type: 'square', length: 0.05, peak: 0.08, attack: 0.001 })
      const held = at + notes.length * 0.055
      v.tone(held, { type: 'square', from: step(C5, 12), length: 0.5, peak: 0.08, attack: 0.001 })
      v.tone(held, { type: 'triangle', from: C5, length: 0.5, peak: 0.25 })
    },
    click: (v, at) =>
      v.tone(at, { type: 'square', from: 2637, length: 0.012, peak: 0.06, attack: 0.001 }),
  },
}

/** A 1979 vector cabinet: laser zaps, thumps, the saucer. */
const vector: PackSpec = {
  hint: 'laser zaps, thumps, and the saucer, a 1979 vector cabinet',
  cues: {
    tick: (v, at) => v.tone(at, { type: 'sine', from: 1000, to: 700, length: 0.02, peak: 0.18 }),
    write: (v, at, level) =>
      v.tone(at, {
        type: 'sawtooth',
        from: 2400,
        to: 400,
        length: 0.045,
        peak: 0.03 + 0.08 * level,
        attack: 0.001,
        lowpass: { from: 5000 },
      }),
    death: (v, at, level) => {
      v.tone(at, {
        type: 'sine',
        from: 90,
        to: 35,
        length: 0.25,
        peak: 0.5 + 0.2 * level,
        attack: 0.002,
      })
      v.noise(at, { filter: 'lowpass', from: 600, to: 100, length: 0.12, peak: 0.15 })
    },
    botDeath: (v, at, _level, bot) => {
      const from = botPitch(bot)
      v.tone(at, {
        type: 'sawtooth',
        from: from * 4,
        to: from / 2,
        length: 0.55,
        peak: 0.12,
        attack: 0.002,
        lowpass: { from: 6000, to: 800 },
      })
      v.noise(at, {
        filter: 'lowpass',
        from: 1200,
        to: 150,
        length: 0.6,
        peak: 0.25,
        attack: 0.004,
      })
    },
    victory: (v, at) => {
      run(v, at, [880, 1046.5, 880, 1046.5, 880, 1046.5], 0.06, {
        type: 'square',
        length: 0.055,
        peak: 0.05,
        lowpass: { from: 3000 },
      })
      v.tone(at + 0.36, {
        type: 'sawtooth',
        from: 220,
        to: 1760,
        length: 0.5,
        peak: 0.1,
        attack: 0.02,
        lowpass: { from: 1500, to: 8000 },
      })
      v.tone(at + 0.86, { type: 'triangle', from: 1760, length: 0.4, peak: 0.25 })
    },
    click: (v, at) =>
      v.tone(at, {
        type: 'square',
        from: 660,
        length: 0.02,
        peak: 0.06,
        attack: 0.001,
        lowpass: { from: 3000 },
      }),
  },
}

/** A 300 baud modem: FSK chirps, the carrier, the handshake. */
const modem: PackSpec = {
  hint: 'FSK chirps, carrier drops, and the handshake, 300 baud',
  cues: {
    tick: (v, at) =>
      v.tone(at, { type: 'sine', from: 1270, length: 0.02, peak: 0.1, attack: 0.002 }),
    // Bell 103: space, then mark.
    write: (v, at, level) =>
      run(v, at, [1070, 1270], 0.014, {
        type: 'sine',
        length: 0.016,
        peak: 0.05 + 0.1 * level,
        attack: 0.002,
      }),
    death: (v, at, level) =>
      v.tone(at, {
        type: 'sine',
        from: 2225,
        to: 980,
        length: 0.08,
        peak: 0.1 + 0.08 * level,
        attack: 0.002,
      }),
    botDeath: (v, at, _level, bot) => {
      v.tone(at, { type: 'sine', from: botPitch(bot) * 2, length: 0.35, peak: 0.1, attack: 0.01 })
      v.noise(at + 0.33, { filter: 'bandpass', from: 2400, q: 0.8, length: 0.12, peak: 0.2 })
      v.tone(at + 0.36, { type: 'square', from: 120, to: 60, length: 0.18, peak: 0.05 })
    },
    victory: (v, at) => {
      // The dial tone, the answer tone, the screech, and the carrier.
      for (const hz of [350, 440])
        v.tone(at, { type: 'sine', from: hz, length: 0.22, peak: 0.1, attack: 0.01 })
      v.tone(at + 0.26, { type: 'sine', from: 2100, length: 0.3, peak: 0.1, attack: 0.01 })
      v.noise(at + 0.6, {
        filter: 'bandpass',
        from: 1600,
        to: 3200,
        q: 3,
        length: 0.35,
        peak: 0.3,
        attack: 0.01,
      })
      run(v, at + 0.6, [1200, 2400, 1200, 2400, 1200, 2400], 0.055, {
        type: 'square',
        length: 0.05,
        peak: 0.03,
      })
      for (const hz of [1200, 2400])
        v.tone(at + 0.98, { type: 'sine', from: hz, length: 0.4, peak: 0.07, attack: 0.01 })
    },
    // The DTMF `1`.
    click: (v, at) => {
      for (const hz of [697, 1209])
        v.tone(at, { type: 'sine', from: hz, length: 0.05, peak: 0.08, attack: 0.002 })
    },
  },
}

/** A mainframe's teletype: relays, typebars, the carriage, the bell. */
const teletype: PackSpec = {
  hint: 'relays, typebars, and the bell, a mainframe teletype',
  cues: {
    tick: (v, at) => v.noise(at, { filter: 'highpass', from: 5000, length: 0.006, peak: 0.15 }),
    write: (v, at, level) => {
      v.noise(at, { filter: 'bandpass', from: 1800, q: 3, length: 0.025, peak: 0.12 + 0.2 * level })
      v.tone(at, { type: 'sine', from: 220, to: 140, length: 0.03, peak: 0.1, attack: 0.001 })
    },
    death: (v, at, level) => {
      v.noise(at, { filter: 'lowpass', from: 500, length: 0.08, peak: 0.35 + 0.2 * level })
      v.tone(at, { type: 'sine', from: 110, to: 60, length: 0.1, peak: 0.3, attack: 0.001 })
    },
    botDeath: (v, at, _level, bot) => bell(v, at, botPitch(bot) * 2, 0.22, 1.1),
    victory: (v, at) => {
      // The carriage returns, and the bell rings twice.
      v.noise(at, {
        filter: 'bandpass',
        from: 800,
        to: 3200,
        q: 2,
        length: 0.3,
        peak: 0.15,
        attack: 0.02,
      })
      v.noise(at + 0.3, { filter: 'lowpass', from: 500, length: 0.06, peak: 0.3 })
      bell(v, at + 0.34, 2093, 0.2, 1.1)
      bell(v, at + 0.64, 2093, 0.2, 1.2)
    },
    click: (v, at) => {
      v.noise(at, { filter: 'highpass', from: 4000, length: 0.005, peak: 0.14 })
      v.noise(at + 0.012, { filter: 'highpass', from: 4000, length: 0.005, peak: 0.1 })
    },
  },
}

/** Outrun: detuned saws, a sweeping filter, an echo. */
const synthwave: PackSpec = {
  hint: 'detuned saws through a sweeping filter, drenched in echo',
  cues: {
    tick: (v, at) =>
      v.tone(at, {
        type: 'sine',
        from: 1318.5,
        length: 0.03,
        peak: 0.08,
        into: v.echo(0.19, 0.38, 0.35),
      }),
    write: (v, at, level) =>
      v.noise(at, { filter: 'highpass', from: 9000, length: 0.03, peak: 0.04 + 0.1 * level }),
    death: (v, at, level) =>
      v.tone(at, {
        type: 'sine',
        from: 130,
        to: 42,
        length: 0.28,
        peak: 0.5 + 0.2 * level,
        attack: 0.002,
      }),
    botDeath: (v, at, _level, bot) => {
      const from = botPitch(bot) / 2
      for (const detune of [1, 1.007]) {
        v.tone(at, {
          type: 'sawtooth',
          from: from * detune,
          to: (from * detune) / 2,
          length: 0.8,
          peak: 0.09,
          attack: 0.01,
          lowpass: { from: 2400, to: 180, q: 6 },
          into: v.echo(0.19, 0.38, 0.35),
        })
      }
    },
    victory: (v, at) => {
      // A minor add 9, the filter opening over it.
      for (const hz of [220, 261.63, 329.63, 440, 493.88]) {
        for (const detune of [0.996, 1.004]) {
          v.tone(at, {
            type: 'sawtooth',
            from: hz * detune,
            length: 1.5,
            peak: 0.04,
            attack: 0.06,
            lowpass: { from: 300, to: 4000, q: 4 },
            into: v.echo(0.19, 0.38, 0.35),
          })
        }
      }
      v.tone(at, { type: 'sine', from: 110, length: 1.5, peak: 0.25, attack: 0.03 })
    },
    click: (v, at) =>
      v.tone(at, {
        type: 'triangle',
        from: 1760,
        length: 0.03,
        peak: 0.1,
        into: v.echo(0.19, 0.38, 0.35),
      }),
  },
}

/** The deep: sonar pings, bubbles, depth charges. */
const sonar: PackSpec = {
  hint: 'sonar pings, bubbles, and depth charges, the deep',
  cues: {
    tick: (v, at) =>
      v.tone(at, { type: 'sine', from: 2400, length: 0.012, peak: 0.05, attack: 0.002 }),
    write: (v, at, level) =>
      v.tone(at, {
        type: 'sine',
        from: 500,
        to: 1400,
        length: 0.04,
        peak: 0.06 + 0.12 * level,
        attack: 0.005,
      }),
    death: (v, at, level) => {
      v.noise(at, {
        filter: 'lowpass',
        from: 300,
        to: 60,
        length: 0.5,
        peak: 0.35 + 0.2 * level,
        attack: 0.01,
      })
      v.tone(at, { type: 'sine', from: 70, to: 30, length: 0.5, peak: 0.35, attack: 0.005 })
    },
    botDeath: (v, at, _level, bot) =>
      v.tone(at, {
        type: 'sine',
        from: botPitch(bot) * 2,
        length: 1.1,
        peak: 0.3,
        attack: 0.003,
        into: v.echo(0.33, 0.45, 0.45),
      }),
    victory: (v, at) =>
      run(v, at, [880, 1174.66, 1760], 0.3, {
        type: 'sine',
        length: 0.5,
        last: 1.4,
        peak: 0.28,
        attack: 0.003,
        into: v.echo(0.33, 0.45, 0.45),
      }),
    click: (v, at) =>
      v.tone(at, {
        type: 'sine',
        from: 1500,
        length: 0.04,
        peak: 0.08,
        attack: 0.002,
        into: v.echo(0.33, 0.45, 0.45),
      }),
  },
}

/** A reactor floor: the Geiger counter, the rumble, the klaxon. */
const geiger: PackSpec = {
  hint: 'Geiger crackle, rumble, and klaxons, a reactor floor',
  cues: {
    tick: (v, at) => v.noise(at, { filter: 'highpass', from: 3000, length: 0.004, peak: 0.2 }),
    // More writes, more counts, at random, as a counter clicks.
    write: (v, at, level) => {
      const counts = 1 + Math.round(level * 5)
      for (let i = 0; i < counts; i++) {
        v.noise(at + Math.random() * 0.1, {
          filter: 'highpass',
          from: 2500,
          length: 0.004,
          peak: 0.22,
        })
      }
    },
    death: (v, at, level) => {
      v.noise(at, {
        filter: 'lowpass',
        from: 180,
        length: 0.35,
        peak: 0.4 + 0.2 * level,
        attack: 0.02,
      })
      v.tone(at, { type: 'sine', from: 55, length: 0.35, peak: 0.2, attack: 0.02 })
    },
    botDeath: (v, at, _level, bot) => {
      const low = botPitch(bot)
      run(v, at, [low, step(low, 4), low, step(low, 4)], 0.15, {
        type: 'sawtooth',
        length: 0.14,
        peak: 0.07,
        attack: 0.01,
        lowpass: { from: 2000 },
      })
    },
    // The all clear.
    victory: (v, at) => {
      const notes = [0, 4, 7, 12].map((s) => step(C5, s))
      run(v, at, notes, 0.18, { type: 'sine', length: 0.6, last: 1.0, peak: 0.22, attack: 0.005 })
      run(
        v,
        at,
        notes.map((hz) => hz * 2),
        0.18,
        { type: 'triangle', length: 0.3, last: 0.6, peak: 0.06 },
      )
    },
    click: (v, at) => {
      v.noise(at, { filter: 'bandpass', from: 1200, q: 2, length: 0.015, peak: 0.2 })
      v.tone(at, { type: 'sine', from: 90, length: 0.03, peak: 0.1, attack: 0.001 })
    },
  },
}

/** Circuit bent: a crusher over zaps and stutters. */
const glitch: PackSpec = {
  hint: 'bitcrushed zaps, stutters, and data rot, circuit bent',
  cues: {
    tick: (v, at) =>
      v.tone(at, {
        type: 'square',
        from: 3000,
        to: 5000,
        length: 0.01,
        peak: 0.08,
        attack: 0.001,
        into: v.crush(6),
      }),
    write: (v, at, level) => {
      for (const offset of [0, 0.012, 0.024]) {
        v.noise(at + offset, {
          filter: 'bandpass',
          from: 5000,
          length: 0.006,
          peak: 0.1 + 0.2 * level,
          into: v.crush(6),
        })
      }
    },
    death: (v, at, level) =>
      v.tone(at, {
        type: 'sawtooth',
        from: 420,
        to: 40,
        length: 0.14,
        peak: 0.12 + 0.1 * level,
        attack: 0.001,
        into: v.crush(4),
      }),
    // The same slice, retriggered, dropping.
    botDeath: (v, at, _level, bot) => {
      const from = botPitch(bot)
      run(
        v,
        at,
        [1, 1, 1, 0.5, 0.5, 0.25].map((ratio) => from * ratio),
        0.05,
        {
          type: 'square',
          length: 0.045,
          last: 0.2,
          peak: 0.12,
          attack: 0.001,
          into: v.crush(4),
        },
      )
    },
    victory: (v, at) => {
      const notes = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27].map((s) => step(220, s))
      run(v, at, notes, 0.04, {
        type: 'square',
        length: 0.035,
        peak: 0.1,
        attack: 0.001,
        into: v.crush(6),
      })
      for (const hz of [440, 660, 880]) {
        v.tone(at + 0.5, {
          type: 'sawtooth',
          from: hz,
          length: 0.55,
          peak: 0.07,
          attack: 0.005,
          into: v.crush(8),
        })
      }
    },
    click: (v, at) =>
      v.tone(at, {
        type: 'square',
        from: 8000,
        length: 0.004,
        peak: 0.1,
        attack: 0.001,
        into: v.crush(6),
      }),
  },
}

/** Every pack, by the name the settings store. */
export const PACKS: Readonly<Record<SoundPack, PackSpec>> = {
  classic,
  chip,
  vector,
  modem,
  teletype,
  synthwave,
  sonar,
  geiger,
  glitch,
}
