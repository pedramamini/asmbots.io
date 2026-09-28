/** The arena intro's battle kinds: one per preset, its rounds and cycles, and who fights. */
import { PRESET_NAMES, PRESETS, type PresetName } from '../../features/arena/setup/config'

/** 100,000 as `100k`: the line must fit a quarter of the intro at 1280 px. */
const thousands = (n: number) => (n % 1000 === 0 ? `${n / 1000}k` : n.toLocaleString('en-US'))

/** Who fights, and how: at most two lines at 1280 px, so the list fits the box it holds. */
const KINDS: Readonly<Record<PresetName, string>> = {
  duel: 'Two bots, head to head. The last alive wins.',
  'melee 8': 'Up to 8 bots. Survivors split the points.',
  'melee 16': 'Up to 16 bots, at half the procs and spacing.',
  'hill rules': 'Two bots under the main hill’s rules.',
}

/** `box`: the placeholder's classes, so the list lands in the space it held. */
export function ArenaKinds({ box }: { box: string }) {
  return (
    <dl className={`${box} grid-cols-4 content-start gap-3 border-t border-border pt-2`}>
      {PRESET_NAMES.map((name) => {
        const { rounds, maxCycles } = PRESETS[name]
        return (
          <div key={name} className="flex min-w-0 flex-col">
            <dt className="text-panel-title text-accent-fg">{name}</dt>
            <dd className="text-panel-status text-muted">
              {rounds} {rounds === 1 ? 'round' : 'rounds'} · {thousands(maxCycles)} cycles
            </dd>
            <dd className="text-data text-muted">{KINDS[name]}</dd>
          </div>
        )
      })}
    </dl>
  )
}
