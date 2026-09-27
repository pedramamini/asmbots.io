/**
 * The roster's entries (roster/README.md): each bot's slug, file, name, author, family, tier, and
 * blurb. No sources here, so a page can list the roster without them: `sources.ts` holds the text
 * of each file, and `images.ts` what each assembles to.
 *
 * A new bot is a file under roster/, its import in `sources.ts` (`sources-large.ts` past 512
 * bytes), a row here, and `bun run roster-images`.
 */

/**
 * The families of roster/README.md: the six classic Core War families, the painters that make the
 * arena worth watching, and the test bots that each pin down one engine behavior.
 */
export const ROSTER_FAMILIES = [
  'imp',
  'dwarf',
  'stone',
  'paper',
  'scanner',
  'vampire',
  'painter',
  'test',
] as const
export type RosterFamily = (typeof ROSTER_FAMILIES)[number]

/** `showcase` bots headline the arena and the goldens, `solid` ones fill out the roster. */
export const ROSTER_TIERS = ['showcase', 'solid', 'test'] as const
export type RosterTier = (typeof ROSTER_TIERS)[number]

export interface RosterEntry {
  /** Kebab-case and unique: the key of `loadRoster` and the file name. */
  slug: string
  /** The path in the package: `roster/<slug>.asm`, or `roster/test/<slug>.asm` for a test bot. */
  file: string
  /** The `%name` of the file. */
  name: string
  /** The `%author` of the file. */
  author: string
  family: RosterFamily
  tier: RosterTier
  /** One line for roster lists. */
  blurb: string
}

export const ROSTER: readonly RosterEntry[] = [
  {
    slug: 'imp',
    file: 'roster/imp.asm',
    name: 'Imp',
    author: 'ASM Bots',
    family: 'imp',
    tier: 'showcase',
    blurb: 'Copies itself one word ahead with movsw and runs into the copy, forever.',
  },
  {
    slug: 'imp-ring',
    file: 'roster/imp-ring.asm',
    name: 'Imp Ring',
    author: 'ASM Bots',
    family: 'imp',
    tier: 'solid',
    blurb: 'Three imps a third of the core apart: kill one and two still walk.',
  },
  {
    slug: 'dwarf',
    file: 'roster/dwarf.asm',
    name: 'Dwarf',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'showcase',
    blurb: 'Drops a DAT word every 4 bytes, walking backward, and ends each lap short of itself.',
  },
  {
    slug: 'dwarf-wide',
    file: 'roster/dwarf-wide.asm',
    name: 'Dwarf Wide',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb: 'An unrolled dwarf with a DAT word every 3 bytes: two bytes in three are zero.',
  },
  {
    slug: 'gate',
    file: 'roster/gate.asm',
    name: 'Gate',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb: 'Kills imps at a word it decrements under its body, and bombs every 9th byte.',
  },
  {
    slug: 'decoy',
    file: 'roster/decoy.asm',
    name: 'Decoy',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb: 'Covers 2 KB around itself with mov noise, then bombs as an unrolled dwarf.',
  },
  {
    slug: 'bastion',
    file: 'roster/bastion.asm',
    name: 'Bastion',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb:
      'A middleweight dwarf, 128 bombs a pass between two fields of fake code: beats dwarf 8-2, imp 9-0-1, scanner 8-2; loses to paper 0-10.',
  },
  {
    slug: 'mender',
    file: 'roster/mender.asm',
    name: 'Mender',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb:
      'A heavyweight bomber that mends its loop from a spare copy: beats dwarf 9-1, scanner 9-1; loses to bastion 3-7, paper 0-8-2, hybrid 0-8-2, twins 0-10.',
  },
  {
    slug: 'citadel',
    file: 'roster/citadel.asm',
    name: 'Citadel',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb:
      'A super-heavy of three bombers that rebuild each other: beats dwarf 9-1, scanner 10-0, bastion 8-2, mender 10-0, hydra 7-3; loses to paper 0-5-5, hybrid 1-8-1, twins 1-7-2.',
  },
  {
    slug: 'swarm',
    file: 'roster/swarm.asm',
    name: 'Swarm',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb:
      'A super-heavy of 64 bombers, one process and one lane each: beats dwarf 9-1, scanner 10-0, hybrid 9-0-1, bastion 7-3, mender 9-1, hydra 7-3; ties paper 10/10; splits twins 3-4-3.',
  },
  {
    slug: 'stone',
    file: 'roster/stone.asm',
    name: 'Stone',
    author: 'ASM Bots',
    family: 'stone',
    tier: 'showcase',
    blurb: 'Two bombers with strides of 4 and 11 and a decoy imp, as three processes.',
  },
  {
    slug: 'paper',
    file: 'roster/paper.asm',
    name: 'Paper',
    author: 'ASM Bots',
    family: 'paper',
    tier: 'showcase',
    blurb: 'Copies itself all over the core with rep movsw and starts every copy with spl.',
  },
  {
    slug: 'silk',
    file: 'roster/silk.asm',
    name: 'Silk',
    author: 'ASM Bots',
    family: 'paper',
    tier: 'solid',
    blurb: 'Starts each copy on a jmp $ pad first, then writes the copy over the pad.',
  },
  {
    slug: 'twins',
    file: 'roster/twins.asm',
    name: 'Twins',
    author: 'ASM Bots',
    family: 'paper',
    tier: 'solid',
    blurb:
      'Middleweight paper whose copies take turns with a dense and a wide burst: beats dwarf 9-0-1, imp 9-0-1, scanner 10-0; ties paper 8 of 10.',
  },
  {
    slug: 'scanner',
    file: 'roster/scanner.asm',
    name: 'Scanner',
    author: 'ASM Bots',
    family: 'scanner',
    tier: 'showcase',
    blurb: 'Scans down for non-zero bytes and carpet-bombs 32 bytes around each one it finds.',
  },
  {
    slug: 'hybrid',
    file: 'roster/hybrid.asm',
    name: 'Hybrid',
    author: 'ASM Bots',
    family: 'scanner',
    tier: 'solid',
    blurb: 'A scanner that turns to paper when bombs land in a guard 768 bytes over its body.',
  },
  {
    slug: 'hydra',
    file: 'roster/hydra.asm',
    name: 'Hydra',
    author: 'ASM Bots',
    family: 'scanner',
    tier: 'solid',
    blurb:
      'A heavyweight that scans a lap, bombs four laps, then walks as an imp ring: beats dwarf 10-0, scanner 10-0, bastion 8-2; loses to paper 0-9-1, hybrid 0-9-1, twins 0-10.',
  },
  {
    slug: 'vampire',
    file: 'roster/vampire.asm',
    name: 'Vampire',
    author: 'ASM Bots',
    family: 'vampire',
    tier: 'showcase',
    blurb: 'Bites code with jmp fangs and holds each bitten process in a pit until the lap ends.',
  },
  {
    slug: 'painter-lcg',
    file: 'roster/painter-lcg.asm',
    name: 'LCG Painter',
    author: 'ASM Bots',
    family: 'painter',
    tier: 'showcase',
    blurb: 'Scatters 0xAA bytes from an LCG in 32 x 32 clouds that drift and now and then jump.',
  },
  {
    slug: 'painter-spiral',
    file: 'roster/painter-spiral.asm',
    name: 'Spiral Painter',
    author: 'ASM Bots',
    family: 'painter',
    tier: 'showcase',
    blurb: 'Paints 0x55 bytes along a square spiral that grows out from its own base.',
  },
  {
    slug: 'halt',
    file: 'roster/test/halt.asm',
    name: 'Halt',
    author: 'ASM Bots',
    family: 'test',
    tier: 'test',
    blurb: 'Runs hlt on its first turn: the bot that dies first.',
  },
  {
    slug: 'spin',
    file: 'roster/test/spin.asm',
    name: 'Spin',
    author: 'ASM Bots',
    family: 'test',
    tier: 'test',
    blurb: 'Jumps to itself forever: the bot that lives to the cycle cap.',
  },
  {
    slug: 'count',
    file: 'roster/test/count.asm',
    name: 'Count',
    author: 'ASM Bots',
    family: 'test',
    tier: 'test',
    blurb: 'Counts ax up to 100 with inc, cmp, and jb, then spins.',
  },
  {
    slug: 'spl-storm',
    file: 'roster/test/spl-storm.asm',
    name: 'SPL Storm',
    author: 'ASM Bots',
    family: 'test',
    tier: 'test',
    blurb: 'Splits over and over until the process cap stops it.',
  },
  {
    slug: 'stack-walk',
    file: 'roster/test/stack-walk.asm',
    name: 'Stack Walk',
    author: 'ASM Bots',
    family: 'test',
    tier: 'test',
    blurb: 'Pushes 256 words, which go down from its base into free core, then spins.',
  },
  {
    slug: 'rep-copy',
    file: 'roster/test/rep-copy.asm',
    name: 'Rep Copy',
    author: 'ASM Bots',
    family: 'test',
    tier: 'test',
    blurb: 'Copies 256 words with one rep movsw, one word a cycle, then spins.',
  },
  {
    slug: 'div-zero',
    file: 'roster/test/div-zero.asm',
    name: 'Div Zero',
    author: 'ASM Bots',
    family: 'test',
    tier: 'test',
    blurb: 'Divides by zero on its second turn and dies with the reason div.',
  },
  {
    slug: 'misalign',
    file: 'roster/test/misalign.asm',
    name: 'Misalign',
    author: 'ASM Bots',
    family: 'test',
    tier: 'test',
    blurb: 'Jumps into the middle of its own instructions: one process dies there, one spins.',
  },
]
