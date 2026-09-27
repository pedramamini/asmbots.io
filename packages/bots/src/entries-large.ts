/**
 * The roster's entries past lightweight (over 512 bytes): a chunk of its own, which
 * `loadLargeImages` loads with their images (`large.ts`), so a page that lists the roster does not
 * carry their blurbs. `ROSTER` is every entry, for a caller that takes the whole roster at once.
 */
import { ROSTER_LIGHT, type RosterEntry } from './entries'

/** The bots past lightweight, middleweight first. */
export const ROSTER_LARGE: readonly RosterEntry[] = [
  {
    slug: 'legion',
    file: 'roster/legion.asm',
    name: 'Legion',
    author: 'ASM Bots',
    family: 'imp',
    tier: 'solid',
    blurb:
      'A middleweight of 12 imps and 48 bombers that gate the next imp: beats imp 10-0, dwarf 9-1-0, scanner 10-0, bastion 8-1-1, hybrid 8-2-0, twins 5-5-0; ties paper 8 of 10; loses to vampire 3-7.',
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
    slug: 'mortar',
    file: 'roster/mortar.asm',
    name: 'Mortar',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb:
      'A middleweight dwarf that lays spl traps for a lap, then DAT over them: beats dwarf 8-2, imp 8-2-0, bastion 8-2, scanner 8-2; splits twins 5-1-4; loses to paper 2-3-5.',
  },
  {
    slug: 'sentinel',
    file: 'roster/sentinel.asm',
    name: 'Sentinel',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb:
      'A middleweight bomber that starts an imp gate when its wire trips: beats imp 10-0, dwarf 9-1, scanner 10-0, bastion 8-2, stone 8-2, vampire 8-2; loses to paper 0-1-9, twins 3-1-6.',
  },
  {
    slug: 'quarry',
    file: 'roster/quarry.asm',
    name: 'Quarry',
    author: 'ASM Bots',
    family: 'stone',
    tier: 'solid',
    blurb:
      'A middleweight stone of four unrolled bombers, four strides, one process each: beats dwarf 8-2, imp 9-1-0, scanner 10-0, bastion 8-2, twins 8-1-1; loses to paper 1-2-7.',
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
    slug: 'origami',
    file: 'roster/origami.asm',
    name: 'Origami',
    author: 'ASM Bots',
    family: 'paper',
    tier: 'solid',
    blurb:
      'Middleweight paper that mends itself from a spare fold: beats bastion 10-0, stone 10-0, dwarf 8-2-0, imp 7-3-0, scanner 9-1-0; ties twins 10 of 10, paper 9 of 10.',
  },
  {
    slug: 'sweeper',
    file: 'roster/sweeper.asm',
    name: 'Sweeper',
    author: 'ASM Bots',
    family: 'scanner',
    tier: 'solid',
    blurb:
      'A middleweight scanner that carpets each hit and sweeps 1.5 KB under it: beats dwarf 10-0, imp 10-0, scanner 10-0, bastion 8-2; loses to paper 0-2-8, twins 0-10.',
  },
  {
    slug: 'harrier',
    file: 'roster/harrier.asm',
    name: 'Harrier',
    author: 'ASM Bots',
    family: 'scanner',
    tier: 'solid',
    blurb:
      'A middleweight scanner that bombs blind when a lap is crowded or empty: beats dwarf 10-0, imp 9-1-0, scanner 10-0, bastion 8-2, vampire 8-2; loses to paper 1-9, twins 2-8.',
  },
  {
    slug: 'leech',
    file: 'roster/leech.asm',
    name: 'Leech',
    author: 'ASM Bots',
    family: 'vampire',
    tier: 'solid',
    blurb:
      'A middleweight vampire that bites with 64 identical fangs and holds the bitten in a pit: beats dwarf 10-0, imp 9-1-0, scanner 10-0, bastion 8-2; loses to paper 0-10, twins 2-8.',
  },
  {
    slug: 'wraith',
    file: 'roster/wraith.asm',
    name: 'Wraith',
    author: 'ASM Bots',
    family: 'imp',
    tier: 'solid',
    blurb:
      'A heavyweight imp: one lap of bombs, then a 1,080-byte imp that walks off bombing two lines: beats dwarf 10-0, hydra 10-0, mender 10-0, imp 9-1-0; loses to paper 0-4-6.',
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
    slug: 'juggernaut',
    file: 'roster/juggernaut.asm',
    name: 'Juggernaut',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb:
      'A heavyweight dwarf with two bomb fronts, one up and one down, a bomb a turn: beats dwarf 9-1, hydra 10-0, mender 10-0, bastion 10-0, vampire 10-0, scanner 10-0; splits swarm 5-5; loses to paper 0-1-9.',
  },
  {
    slug: 'garrison',
    file: 'roster/garrison.asm',
    name: 'Garrison',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb:
      'A heavyweight dwarf with an imp gate that mends its bomber by a vote of three copies: beats imp 10-0, dwarf 10-0, mender 10-0; loses to hydra 2-8 and paper 0-1-9.',
  },
  {
    slug: 'colossus',
    file: 'roster/colossus.asm',
    name: 'Colossus',
    author: 'ASM Bots',
    family: 'stone',
    tier: 'solid',
    blurb:
      'A heavyweight stone of six unrolled bombers with prime strides, four up and two down: beats dwarf 10-0, imp 9-0-1, mender 10-0; loses to hydra 4-6 and paper 3-1-6.',
  },
  {
    slug: 'phalanx',
    file: 'roster/phalanx.asm',
    name: 'Phalanx',
    author: 'ASM Bots',
    family: 'stone',
    tier: 'solid',
    blurb:
      'A heavyweight stone: a wall of eight bombers that bomb out from the body both ways: beats dwarf 10-0, hydra 10-0, mender 10-0, imp 9-1-0; loses to paper 0-3-7.',
  },
  {
    slug: 'labyrinth',
    file: 'roster/labyrinth.asm',
    name: 'Labyrinth',
    author: 'ASM Bots',
    family: 'paper',
    tier: 'solid',
    blurb:
      'Heavyweight paper whose 1 KB copies each drop a field of 256 bombs: beats hydra 10-0, bastion 10-0, citadel 9-1, mender 9-1-0, imp 9-0-1; ties paper 8 of 10; loses to swarm 1-9, juggernaut 2-8.',
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
    slug: 'kraken',
    file: 'roster/kraken.asm',
    name: 'Kraken',
    author: 'ASM Bots',
    family: 'scanner',
    tier: 'solid',
    blurb:
      'A heavyweight of three scanners in parallel, each with its own sector and an unrolled strike: beats dwarf 10-0, imp 10-0, mender 10-0, hydra 8-2, bastion 8-2; loses to juggernaut 2-8, twins 1-9, paper 0-10.',
  },
  {
    slug: 'basilisk',
    file: 'roster/basilisk.asm',
    name: 'Basilisk',
    author: 'ASM Bots',
    family: 'vampire',
    tier: 'solid',
    blurb:
      'A heavyweight vampire that bites with a 928-byte table of fangs and sets the bitten on their own bot: beats dwarf 10-0, imp 10-0, hydra 10-0, mender 8-2, swarm 8-2; loses to juggernaut 0-10, paper 0-4-6, twins 4-6.',
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
    slug: 'titan',
    file: 'roster/titan.asm',
    name: 'Titan',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb:
      'A super-heavy dwarf that moves between two homes and rewrites the one it goes to: beats dwarf 8-2, scanner 10-0, bastion 10-0, hydra 10-0, mender 10-0, swarm 7-3; splits citadel 5-5; loses to paper 0-1-9, monolith 0-10.',
  },
  {
    slug: 'dreadnought',
    file: 'roster/dreadnought.asm',
    name: 'Dreadnought',
    author: 'ASM Bots',
    family: 'dwarf',
    tier: 'solid',
    blurb:
      'A super-heavy bomber of three unrolled loops that mend from a spare copy: beats dwarf 10-0, imp 10-0, scanner 10-0, vampire 10-0, hydra 10-0, mender 10-0; splits citadel 5-5; loses to swarm 4-6, twins 2-8, paper 0-10.',
  },
  {
    slug: 'monolith',
    file: 'roster/monolith.asm',
    name: 'Monolith',
    author: 'ASM Bots',
    family: 'stone',
    tier: 'solid',
    blurb:
      'A super-heavy stone of eight bombers in eight cells, strides 6 to 116: beats dwarf 10-0, citadel 9-1, swarm 7-3, bastion 10-0, hydra 10-0, twins 7-1-2, titan 10-0; loses to paper 0-2-8.',
  },
  {
    slug: 'fortress',
    file: 'roster/fortress.asm',
    name: 'Fortress',
    author: 'ASM Bots',
    family: 'stone',
    tier: 'solid',
    blurb:
      'A super-heavy stone of three bombers between two imp gates: beats dwarf 10-0, imp 10-0, scanner 10-0, hydra 10-0, mender 9-1, bastion 8-1-1; splits swarm 5-2-3, citadel 4-2-4; loses to twins 1-9, paper 0-6-4.',
  },
  {
    slug: 'behemoth',
    file: 'roster/behemoth.asm',
    name: 'Behemoth',
    author: 'ASM Bots',
    family: 'paper',
    tier: 'solid',
    blurb:
      'Super-heavy paper that bombs each landing place flat before it copies itself there: beats dwarf 10-0, imp 8-2-0, scanner 10-0, mender 10-0, hydra 8-2; loses to paper 0-10, citadel 1-9, swarm 2-8.',
  },
  {
    slug: 'hive',
    file: 'roster/hive.asm',
    name: 'Hive',
    author: 'ASM Bots',
    family: 'paper',
    tier: 'solid',
    blurb:
      'A super-heavy paper of 24 small cells, each on a path of its own: beats dwarf 10-0, imp 10-0, citadel 10-0, mender 10-0, swarm 7-3-0, vampire 6-4; splits twins 5-5-0; ties paper 10/10.',
  },
  {
    slug: 'leviathan',
    file: 'roster/leviathan.asm',
    name: 'Leviathan',
    author: 'ASM Bots',
    family: 'scanner',
    tier: 'solid',
    blurb:
      'A super-heavy of four scanner cells, two up and two down: beats dwarf 10-0, imp 10-0, scanner 10-0, hydra 10-0, bastion 8-2; loses to paper 0-4-6, citadel 0-10, swarm 1-9.',
  },
  {
    slug: 'overlord',
    file: 'roster/overlord.asm',
    name: 'Overlord',
    author: 'ASM Bots',
    family: 'vampire',
    tier: 'solid',
    blurb:
      'A super-heavy vampire that bites 1 KB with fangs, zeros 2 KB from its pit, and gates imps: beats dwarf 10-0, imp 10-0, scanner 10-0, mender 10-0, vampire 8-2; loses to citadel 4-6, swarm 1-9, paper 0-10, twins 0-10.',
  },
]

/** Every roster entry: the lightweight bots and the test bots, then the bots past lightweight. */
export const ROSTER: readonly RosterEntry[] = [...ROSTER_LIGHT, ...ROSTER_LARGE]
