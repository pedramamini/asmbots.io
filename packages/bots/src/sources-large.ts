/**
 * The text of each roster file past lightweight (over 512 bytes), by slug: a chunk of its own,
 * which `loadLargeSources` loads (`large.ts`). The others are in `sources.ts`.
 */
import bastion from '../roster/bastion.asm' with { type: 'text' }
import citadel from '../roster/citadel.asm' with { type: 'text' }
import hydra from '../roster/hydra.asm' with { type: 'text' }
import mender from '../roster/mender.asm' with { type: 'text' }
import swarm from '../roster/swarm.asm' with { type: 'text' }
import twins from '../roster/twins.asm' with { type: 'text' }

export const LARGE_SOURCES: Readonly<Record<string, string>> = {
  bastion,
  twins,
  mender,
  hydra,
  citadel,
  swarm,
}
