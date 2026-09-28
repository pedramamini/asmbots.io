/**
 * The site's art (DESIGN_SYSTEM §10), one chunk that loads after the page paints: `./lazy`
 * holds the stand-ins a page renders.
 */

import { useMemo } from 'react'
import { arenaFloor, bracket, chart, disk, manual, summit, terminal } from './banners'
import type { BotName } from './bots'
import { DitherPlate } from './DitherPlate'
import { botPortrait, chip, footerRange, podium, trophy } from './scenes'

export { BOT_NAMES, type BotName } from './bots'

export { HexBand } from './HexBand'
export { Schematic } from './Schematic'
export { ScopeTrace } from './ScopeTrace'

/** The dither plates, by name, so a page names one without loading its scene. */
const SCENES = {
  arena: arenaFloor,
  bracket,
  chart,
  chip,
  disk,
  footer: footerRange('/').scene,
  manual,
  podium,
  summit,
  terminal,
  trophy,
} as const

export type PlateName = keyof typeof SCENES

export function NamedPlate({
  name,
  cell,
  className,
}: {
  name: PlateName
  cell?: number | undefined
  className?: string | undefined
}) {
  return <DitherPlate scene={SCENES[name]} cell={cell} className={className} />
}

/** One of the 24 dither bots, large, on a floor: a plate at least 0.8 as wide as it is high. */
export function BotPlate({
  bot,
  cell,
  className,
}: {
  bot: BotName
  cell?: number | undefined
  className?: string | undefined
}) {
  const scene = useMemo(() => botPortrait(bot), [bot])
  return <DitherPlate scene={scene} cell={cell} className={className} />
}
