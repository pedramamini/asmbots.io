/**
 * The text of each roster file past lightweight (over 512 bytes), by slug: a chunk of its own,
 * which `loadLargeSources` loads (`large.ts`). The others are in `sources.ts`.
 */
import basilisk from '../roster/basilisk.asm' with { type: 'text' }
import bastion from '../roster/bastion.asm' with { type: 'text' }
import behemoth from '../roster/behemoth.asm' with { type: 'text' }
import citadel from '../roster/citadel.asm' with { type: 'text' }
import colossus from '../roster/colossus.asm' with { type: 'text' }
import dreadnought from '../roster/dreadnought.asm' with { type: 'text' }
import fortress from '../roster/fortress.asm' with { type: 'text' }
import garrison from '../roster/garrison.asm' with { type: 'text' }
import harrier from '../roster/harrier.asm' with { type: 'text' }
import hive from '../roster/hive.asm' with { type: 'text' }
import hydra from '../roster/hydra.asm' with { type: 'text' }
import juggernaut from '../roster/juggernaut.asm' with { type: 'text' }
import kraken from '../roster/kraken.asm' with { type: 'text' }
import labyrinth from '../roster/labyrinth.asm' with { type: 'text' }
import leech from '../roster/leech.asm' with { type: 'text' }
import legion from '../roster/legion.asm' with { type: 'text' }
import leviathan from '../roster/leviathan.asm' with { type: 'text' }
import mender from '../roster/mender.asm' with { type: 'text' }
import monolith from '../roster/monolith.asm' with { type: 'text' }
import mortar from '../roster/mortar.asm' with { type: 'text' }
import origami from '../roster/origami.asm' with { type: 'text' }
import overlord from '../roster/overlord.asm' with { type: 'text' }
import phalanx from '../roster/phalanx.asm' with { type: 'text' }
import quarry from '../roster/quarry.asm' with { type: 'text' }
import sentinel from '../roster/sentinel.asm' with { type: 'text' }
import swarm from '../roster/swarm.asm' with { type: 'text' }
import sweeper from '../roster/sweeper.asm' with { type: 'text' }
import titan from '../roster/titan.asm' with { type: 'text' }
import twins from '../roster/twins.asm' with { type: 'text' }
import wraith from '../roster/wraith.asm' with { type: 'text' }

export const LARGE_SOURCES: Readonly<Record<string, string>> = {
  bastion,
  twins,
  mender,
  hydra,
  citadel,
  swarm,
  basilisk,
  behemoth,
  colossus,
  dreadnought,
  fortress,
  garrison,
  harrier,
  hive,
  juggernaut,
  kraken,
  labyrinth,
  leech,
  legion,
  leviathan,
  monolith,
  mortar,
  origami,
  overlord,
  phalanx,
  quarry,
  sentinel,
  sweeper,
  titan,
  wraith,
}
