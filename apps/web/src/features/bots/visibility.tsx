/**
 * Who may see a bot (PRODUCT_SPEC §0): each cloud bot is public, unlisted, or private, and a bot
 * not in the account is local. One look everywhere: the arena's cards and table, the bot page.
 */
import type { Visibility } from '@asmbots/protocol'
import { Button, Chip, type ChipVariant, Menu, Segmented } from '@asmbots/ui'
import { Eye, EyeOff, Link, type LucideIcon } from 'lucide-react'

/** A bot's visibility, or `local`: kept in this browser only. */
export type BotVisibility = Visibility | 'local'

interface VisibilityLook {
  readonly icon: LucideIcon | undefined
  readonly variant: ChipVariant
  /** What it means, in a sentence: a chip's title, a picker's help. */
  readonly about: string
}

export const VISIBILITY: Readonly<Record<BotVisibility, VisibilityLook>> = {
  public: {
    icon: Eye,
    variant: 'accent',
    about: 'public: anyone can see, fight, and fork it, and it competes in the roster',
  },
  unlisted: {
    icon: Link,
    variant: 'info',
    about: 'unlisted: anyone with its link can see it; its source stays hidden',
  },
  private: { icon: EyeOff, variant: 'warn', about: 'private: only you can see it' },
  local: {
    icon: undefined,
    variant: 'neutral',
    about: 'local: in this browser only, not in your account',
  },
}

/** The account's visibilities, the most open first: what an owner picks from. */
export const VISIBILITIES = [
  'public',
  'unlisted',
  'private',
] as const satisfies readonly Visibility[]

/** A bot's visibility as a chip: its icon, its word, and what it means on hover. */
export function VisibilityChip({ visibility }: { visibility: BotVisibility }) {
  const look = VISIBILITY[visibility]
  return (
    <Chip variant={look.variant} icon={look.icon} title={look.about}>
      {visibility}
    </Chip>
  )
}

/**
 * The owner's control on a bot's page: the three visibilities side by side, the chosen one lit,
 * and what it means under them. `onChange` gets the new one; `busy` holds it while a change runs.
 */
export function VisibilityPicker({
  value,
  onChange,
  busy = false,
}: {
  value: Visibility
  onChange: (visibility: Visibility) => void
  busy?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <Segmented<Visibility>
        label="visibility"
        options={VISIBILITIES.map((v) => ({ value: v, label: v, disabled: busy }))}
        value={value}
        onValueChange={onChange}
      />
      <p className="text-data text-muted">{VISIBILITY[value].about}</p>
    </div>
  )
}

/**
 * A card's control for one of my account bots: its visibility as a button that opens the other
 * two, so a change is two clicks from any list of my bots.
 */
export function VisibilityMenu({
  name,
  value,
  onChange,
}: {
  /** The bot's name, for the button's accessible name. */
  name: string
  value: Visibility
  onChange: (visibility: Visibility) => void
}) {
  const look = VISIBILITY[value]
  return (
    <Menu
      placement="bottom-end"
      trigger={
        <Button
          size="sm"
          icon={look.icon}
          title={look.about}
          aria-label={`${value}: who may see ${name}`}
        >
          {value} ▾
        </Button>
      }
      items={VISIBILITIES.map((v) => ({
        label: v === value ? `${v} (now)` : `make ${v}`,
        icon: VISIBILITY[v].icon,
        disabled: v === value,
        onSelect: () => onChange(v),
      }))}
    />
  )
}
