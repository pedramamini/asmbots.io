/**
 * The home page's share card (PRODUCT_SPEC §10): the pitch at the left, over Dwarf's listing and
 * the legend of the bots in the fight, and at the right the arena of a real 8-bot battle of the
 * roster at `CYCLE`, each byte in its owner's hue and brighter the more recent its last write. A
 * dump of that core's bytes runs behind it all. The battle is fixed, so the card is drawn once an
 * isolate and changes only with the engine or the roster.
 */
import { rosterImage } from '@asmbots/bots/images'
import { Battle, CORE_SIZE, IP, NullSink } from '@asmbots/engine'
import { CARD_HEIGHT, CARD_WIDTH, type PageMeta } from '@asmbots/protocol'
import { card, count, fits, hue, MARGIN, SENTINEL, text, wrap } from './card'

/** The bots in the fight, in hue order: the legend's order. */
export const HOME_BOTS = [
  'imp-ring',
  'dwarf',
  'stone',
  'paper',
  'scanner',
  'silk',
  'vampire',
  'painter-spiral',
] as const
/** The cycle the arena shows. */
export const CYCLE = 12_400
/** The placement seed: one whose battle keeps every bot alive past `CYCLE`, spread out. */
export const SEED = 1

/**
 * Dwarf's listing as the card shows it: address, bytes, mnemonic, operands, and a comment. The
 * test keeps its bytes what the roster's dwarf.asm assembles to.
 */
export const LISTING: readonly (readonly [string, string, string, string, string?])[] = [
  ['0000', 'e8 00 00', 'call', '.here'],
  ['0003', '5b', 'pop', 'bx'],
  ['0004', '83 eb 03', 'sub', 'bx, .here'],
  ['0007', '89 df', 'mov', 'di, bx'],
  ['0009', 'b9 fa 3f', 'mov', 'cx, 0x3ffa'],
  ['000C', '83 ef 04', 'sub', 'di, 4'],
  ['000F', 'c7 05 00 00', 'mov', 'word [di], 0', '; bomb'],
  ['0013', 'e2 f7', 'loop', '.bomb'],
  ['0015', 'eb f0', 'jmp', 'lap'],
]

const WIDTH = 560
const HEADLINE = 46
const CODE = 17
const CODE_STEP = 26
const CODE_Y = 306
/** A code glyph's width, px. */
const CH = CODE * 0.6

/** The arena: the 256 × 256 owner map at twice the size, right of the text column. */
const SIDE = 256
const SCALE = 2
const ARENA_X = CARD_WIDTH - MARGIN - SIDE * SCALE
const ARENA_Y = 44

/** The dump behind: its font, line step, and bytes a line. */
const DUMP = 13
const DUMP_STEP = 18
const DUMP_BYTES = 48

/** How the recency of a byte's last write lights it: at most `age` cycles ago, this opacity. */
const HEAT: readonly (readonly [number, number])[] = [
  [300, 1],
  [1500, 0.78],
  [5000, 0.55],
  [Number.POSITIVE_INFINITY, 0.34],
]

/** The fight at `CYCLE`: the core, who owns each byte, when each was last written, the bots. */
export interface HomeFight {
  readonly names: readonly string[]
  readonly bytes: Uint8Array
  readonly owners: Uint8Array
  /** The cycle + 1 of each byte's last write; 0 for a byte no bot wrote. */
  readonly written: Uint32Array
  /** Each living bot's process addresses, at most 3. */
  readonly ips: readonly (readonly number[])[]
  readonly cycle: number
}

class LastWrite extends NullSink {
  readonly written = new Uint32Array(CORE_SIZE)

  override write(cycle: number, _bot: number, addr: number, len: number): void {
    for (let k = 0; k < len; k++) this.written[(addr + k) % CORE_SIZE] = cycle + 1
  }
}

let fought: HomeFight | undefined

/** The battle, run once an isolate. */
export function homeFight(): HomeFight {
  if (fought !== undefined) return fought
  const images = HOME_BOTS.map((slug) => rosterImage(slug))
  const sink = new LastWrite()
  const battle = new Battle(
    images.map(({ name, bytes }) => ({ name, bytes })),
    { seed: SEED, maxCycles: CYCLE },
    sink,
  )
  battle.run()
  fought = {
    names: images.map((image) => image.name),
    bytes: battle.core.bytes,
    owners: battle.core.owner,
    written: sink.written,
    ips: battle.bots.map(({ queue }) =>
      Array.from({ length: Math.min(queue.size, 3) }, (_, i) => {
        const row = queue.rows[queue.at(i)] as Uint16Array
        return row[IP] as number
      }),
    ),
    cycle: battle.cycle,
  }
  return fought
}

/** The home page's card, with `page`'s headline; `host` signs it. */
export function homeCard(page: PageMeta, host: string, fight = homeFight()): string {
  return card(`ASM BOTS: ${page.headline}`, [
    dump(fight),
    `<text x="${MARGIN}" y="84" fill="${SENTINEL.accent}" font-size="20" font-weight="700" letter-spacing="6">ASM BOTS</text>`,
    ...wrap(page.headline, fits(WIDTH, HEADLINE), 2).map(
      (line, i) =>
        `<text x="${MARGIN}" y="${152 + i * 58}" fill="${SENTINEL.bright}" font-size="${HEADLINE}" font-weight="700">${text(line)}</text>`,
    ),
    listing(),
    legend(fight.names),
    arena(fight),
    `<text x="${CARD_WIDTH - MARGIN}" y="${CARD_HEIGHT - 34}" font-size="16" text-anchor="end" fill="${SENTINEL.muted}"><tspan fill="${SENTINEL.bright}" font-weight="700">${text(host)}</tspan> · editor · debugger · tournaments · hills</text>`,
  ])
}

/** The core's bytes as a hex dump across the card, dim, a bot's bytes in its hue. */
function dump({ bytes, owners }: HomeFight): string {
  const rows = Math.ceil(CARD_HEIGHT / DUMP_STEP)
  const ch = DUMP * 0.6
  // From the first bot's base, so the dump opens on code.
  const start = owners.indexOf(1) & ~0xf
  const lines: string[] = []
  for (let r = 0; r < rows; r++) {
    const base = (start + r * DUMP_BYTES) % CORE_SIZE
    const runs = [`<tspan>${hex(base, 4)}</tspan>`]
    let i = 0
    while (i < DUMP_BYTES) {
      const owner = owners[(base + i) % CORE_SIZE] as number
      let end = i + 1
      while (end < DUMP_BYTES && owners[(base + end) % CORE_SIZE] === owner) end++
      const cells = []
      for (let k = i; k < end; k++) cells.push(hex(bytes[(base + k) % CORE_SIZE] as number, 2))
      const fill = owner === 0 ? '' : ` fill="${hue(owner - 1)}" fill-opacity="0.5"`
      runs.push(`<tspan x="${8 + (6 + i * 3) * ch}"${fill}>${cells.join(' ')}</tspan>`)
      i = end
    }
    lines.push(`<text x="8" y="${14 + r * DUMP_STEP}">${runs.join('')}</text>`)
  }
  return `<g font-size="${DUMP}" fill="${SENTINEL.borderStrong}" opacity="0.42">${lines.join('')}</g>`
}

/** Dwarf's listing under its comment line: address, bytes, mnemonic, operands in their colors. */
function listing(): string {
  const size = LISTING.reduce((n, [, bytes]) => n + bytes.split(' ').length, 0)
  const at = (col: number) => MARGIN + col * CH
  const rows = LISTING.map(([addr, bytes, op, args, note], i) => {
    const y = CODE_Y + i * CODE_STEP
    const comment =
      note === undefined ? '' : `<tspan fill="${SENTINEL.dim}">${LEAD_SPACES}${text(note)}</tspan>`
    return [
      `<text x="${at(0)}" y="${y}" fill="${SENTINEL.dim}">${addr}</text>`,
      `<text x="${at(6)}" y="${y}" fill="${hue(2)}">${bytes}</text>`,
      `<text x="${at(18)}" y="${y}" fill="${SENTINEL.bright}">${op}</text>`,
      `<text x="${at(23)}" y="${y}" fill="${SENTINEL.text}" xml:space="preserve">${operands(args)}${comment}</text>`,
    ].join('')
  })
  return [
    `<text x="${MARGIN}" y="${CODE_Y - 36}" font-size="${CODE}" fill="${SENTINEL.accent}" fill-opacity="0.8">; dwarf.asm · ${size} bytes · bombs every 4th byte</text>`,
    `<g font-size="${CODE}">${rows.join('')}</g>`,
  ].join('')
}

/** The spaces between an operand and its comment. */
const LEAD_SPACES = '   '

/** `args` with its numbers in the literal color. */
function operands(args: string): string {
  return text(args).replace(
    /\b(0x[0-9a-f]+|\d+)\b/g,
    (number) => `<tspan fill="${hue(6)}">${number}</tspan>`,
  )
}

/** Each bot's swatch and name, in rows the text column's width. */
function legend(names: readonly string[]): string {
  const size = 15
  const ch = size * 0.6
  const parts: string[] = []
  let x = MARGIN
  let y = CARD_HEIGHT - 62
  names.forEach((name, i) => {
    const width = 20 + name.length * ch
    if (x + width > MARGIN + WIDTH) {
      x = MARGIN
      y += 26
    }
    parts.push(
      `<rect x="${x}" y="${y - 12}" width="12" height="12" rx="2" fill="${hue(i)}"/>`,
      `<text x="${x + 20}" y="${y}" fill="${SENTINEL.text}">${text(name)}</text>`,
    )
    x += width + 20
  })
  return `<g font-size="${size}">${parts.join('')}</g>`
}

/** The arena panel: the owner map lit by recency, the processes, the ruler, and its labels. */
function arena(fight: HomeFight): string {
  const w = SIDE * SCALE
  const chip = `CYCLE ${count(fight.cycle)} · ${fight.names.length} BOTS · 64 KB CORE`
  const chipWidth = chip.length * (13 * 0.6 + 1) + 20
  const rings = fight.ips.flatMap((ips, bot) =>
    ips.map(
      (ip) =>
        `<circle cx="${ARENA_X + (ip % SIDE) * SCALE + 1}" cy="${ARENA_Y + Math.floor(ip / SIDE) * SCALE + 1}" r="6" fill="none" stroke="${hue(bot)}" stroke-width="1.5"/>`,
    ),
  )
  const ruler = Array.from({ length: 16 }, (_, i) => {
    const y = ARENA_Y + i * 16 * SCALE + 10
    return `<text x="${ARENA_X + 4}" y="${y}">${`0x${hex(i * 0x1000, 4)}`}</text>`
  })
  return [
    '<defs><filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="8"/></filter></defs>',
    `<rect x="${ARENA_X - 2}" y="${ARENA_Y - 2}" width="${w + 4}" height="${w + 4}" fill="none" stroke="${SENTINEL.accent}" stroke-opacity="0.35" stroke-width="4" filter="url(#glow)"/>`,
    `<rect x="${ARENA_X - 1}" y="${ARENA_Y - 1}" width="${w + 2}" height="${w + 2}" fill="${SENTINEL.arena}" stroke="${SENTINEL.borderStrong}" stroke-width="2"/>`,
    `<g transform="translate(${ARENA_X} ${ARENA_Y}) scale(${SCALE})" shape-rendering="crispEdges">`,
    ...litRuns(fight),
    '</g>',
    `<g font-size="9" fill="${SENTINEL.muted}" fill-opacity="0.7">${ruler.join('')}</g>`,
    ...rings,
    `<rect x="${ARENA_X + 10}" y="${ARENA_Y + 10}" width="${chipWidth}" height="26" fill="${SENTINEL.bg}" fill-opacity="0.85" stroke="${SENTINEL.borderStrong}"/>`,
    `<text x="${ARENA_X + 20}" y="${ARENA_Y + 28}" font-size="13" letter-spacing="1" fill="${SENTINEL.text}">${chip}</text>`,
    `<circle cx="${ARENA_X + w - 68}" cy="${ARENA_Y + 23}" r="4" fill="${SENTINEL.accent}"/>`,
    `<text x="${ARENA_X + w - 12}" y="${ARENA_Y + 28}" font-size="13" letter-spacing="2" text-anchor="end" fill="${SENTINEL.accent}">ARENA</text>`,
  ].join('')
}

/** One `<g>` per owner and heat, holding a `<rect>` for each run of its bytes in a row. */
function litRuns({ owners, written, cycle }: HomeFight): string[] {
  const heatOf = (a: number): number => {
    const last = written[a] as number
    // A byte no bot wrote since the load is the bot's own code: lit as a write of long ago.
    const age = last === 0 ? Number.POSITIVE_INFINITY : cycle - (last - 1)
    return HEAT.findIndex(([most]) => age <= most)
  }
  const runs = new Map<number, string[]>()
  for (let y = 0; y < SIDE; y++) {
    const row = y * SIDE
    let x = 0
    while (x < SIDE) {
      const owner = owners[row + x] as number
      const heat = heatOf(row + x)
      let end = x + 1
      while (end < SIDE && owners[row + end] === owner && heatOf(row + end) === heat) end++
      if (owner !== 0) {
        const key = owner * HEAT.length + heat
        const list = runs.get(key) ?? []
        if (list.length === 0) runs.set(key, list)
        list.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1"/>`)
      }
      x = end
    }
  }
  return [...runs.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, rects]) => {
      const owner = Math.floor(key / HEAT.length)
      const opacity = (HEAT[key % HEAT.length] as readonly [number, number])[1]
      return `<g fill="${hue(owner - 1)}" fill-opacity="${opacity}">${rects.join('')}</g>`
    })
}

/** `n` in lowercase hex, `digits` wide. */
function hex(n: number, digits: number): string {
  return n.toString(16).padStart(digits, '0')
}
