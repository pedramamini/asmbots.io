/**
 * The preset help dialog (`ConfigForm`'s `ⓘ`): its own chunk, loaded on the first open, so its
 * prose stays out of `/arena`'s cold JS.
 */
import { Button, Modal } from '@asmbots/ui'
import type { ReactNode } from 'react'
import { DocsLink } from '../../../app/PageIntro'
import { PRESET_NAMES, PRESETS, type PresetName } from './config'

const count = (n: number) => n.toLocaleString('en-US')

/** What each preset is for, and the bots it suits: the help dialog's rows. */
const PRESET_ABOUT: Readonly<Record<PresetName, { bots: string; about: ReactNode }>> = {
  duel: {
    bots: '2',
    about: "Two bots, head to head, at the engine's defaults. The last bot alive wins the round.",
  },
  'melee 8': {
    bots: 'up to 8',
    about:
      'A crowd in one core, with twice the cycles to thin out. The survivors share the points, so a tie pays.',
  },
  'melee 16': {
    bots: 'up to 16',
    about:
      'A bigger crowd. The process cap and the spacing halve: 16 bots share the process budget of 8, and all of them fit in the core.',
  },
  'hill rules': {
    bots: '2',
    about: (
      <>
        The main hill's duels: 10 rounds of 80,000 cycles. A score here compares with the{' '}
        <DocsLink to="tournaments/hills">hill's</DocsLink>.
      </>
    ),
  },
}

/** A dialog that tells duel, melee, and hill rules apart, with each preset's values. */
export function PresetDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="the presets"
      size="lg"
      actions={
        <Button variant="ghost" onClick={onClose}>
          close
        </Button>
      }
    >
      <div className="flex flex-col gap-3 text-body text-text">
        <p>
          A preset sets the rounds, the cycles, the process cap, and the spacing. The bots you pick
          decide who fights. Change a value and the config is <code>custom</code>.
        </p>
        <dl className="flex flex-col gap-3">
          {PRESET_NAMES.map((name) => {
            const values = PRESETS[name]
            return (
              <div key={name} className="flex flex-col gap-1">
                <dt className="flex flex-wrap items-baseline gap-x-3">
                  <code className="text-accent-fg">{name}</code>
                  <span className="text-data text-muted">
                    {PRESET_ABOUT[name].bots} bots · {count(values.rounds)}{' '}
                    {values.rounds === 1 ? 'round' : 'rounds'} · {count(values.maxCycles)} cycles ·{' '}
                    {count(values.maxProcesses)} procs · {count(values.minSpacing)} B apart
                  </span>
                </dt>
                <dd>{PRESET_ABOUT[name].about}</dd>
              </div>
            )
          })}
        </dl>
        <p className="text-muted">
          More in <DocsLink to="tournaments/formats">formats</DocsLink> and{' '}
          <DocsLink to="strategy/melee">melee tactics</DocsLink>.
        </p>
      </div>
    </Modal>
  )
}
