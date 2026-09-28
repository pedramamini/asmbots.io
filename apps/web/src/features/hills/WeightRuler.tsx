/**
 * The hills on one ruler of bot sizes, 0 to 4,096 bytes, drawn to scale: the four weight classes
 * as bands behind it (each twice the last), and each hill as a bar over the sizes it takes. A
 * table to assistive tech: each hill and its band in words.
 */
import { type HillSummary, MAX_BOT_BYTES_ALL, WEIGHT_CLASSES } from '@asmbots/protocol'
import { cx } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { CELL_LINK, count } from './links'
import { bandText } from './rules'
import { WEIGHT_SHORT } from './weight-names'

/** A size's place on the ruler, a percent of its width. */
const at = (bytes: number) => `${(100 * bytes) / MAX_BOT_BYTES_ALL}%`

/** The ruler's marks: each class's cap. */
const MARKS = [0, ...WEIGHT_CLASSES.map((c) => c.max)]

const kb = (bytes: number) => (bytes >= 1024 ? `${bytes / 1024}K` : String(bytes))

export function WeightRuler({ hills }: { hills: readonly HillSummary[] }) {
  return (
    <div className="flex flex-col gap-1">
      {/* The classes: a band each, its name and how far apart its bots start. */}
      <div className="flex gap-2">
        <span className="w-28 shrink-0" />
        <div aria-hidden="true" className="relative h-9 flex-1">
          {WEIGHT_CLASSES.map((c, i) => (
            <div
              key={c.slug}
              className={cx(
                'absolute inset-y-0 flex flex-col justify-end overflow-hidden border-border border-l px-1 pb-1',
                i % 2 === 0 ? 'bg-panel-2' : '',
              )}
              style={{ left: at(c.min - 1), width: at(c.max - c.min + 1) }}
            >
              <span className="truncate text-bright text-panel-status">{WEIGHT_SHORT[c.slug]}</span>
              <span className="truncate text-muted text-panel-status">{kb(c.minSpacing)} apart</span>
            </div>
          ))}
        </div>
        <span className="hidden w-32 shrink-0 sm:block" />
      </div>
      <table className="w-full border-separate border-spacing-y-1 text-data">
        <caption className="sr-only">each hill and the bot sizes it takes</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">hill</th>
            <th scope="col">sizes</th>
          </tr>
        </thead>
        <tbody>
          {hills.map(({ hill }) => {
            const min = hill.config.minBotBytes ?? 1
            const max = hill.config.maxBotBytes
            return (
              <tr key={hill.id} className="flex items-center gap-2">
                <th scope="row" className="w-28 shrink-0 whitespace-nowrap text-left font-normal">
                  <Link to="/hills/$slug" params={{ slug: hill.slug }} className={CELL_LINK}>
                    {hill.name}
                  </Link>
                </th>
                <td className="relative h-5 flex-1">
                  <span aria-hidden="true" className="absolute inset-0 rounded-sm bg-panel-2" />
                  {WEIGHT_CLASSES.slice(1).map((c) => (
                    <span
                      key={c.slug}
                      aria-hidden="true"
                      className="absolute inset-y-0 border-border border-l"
                      style={{ left: at(c.min - 1) }}
                    />
                  ))}
                  <span
                    aria-hidden="true"
                    className={cx(
                      'dither absolute inset-y-0.5 rounded-sm border',
                      hill.scoring === 'melee'
                        ? 'border-info text-info'
                        : 'border-accent text-accent',
                    )}
                    style={{ left: at(min - 1), width: at(max - min + 1) }}
                  />
                  <span className="sr-only">{bandText(hill.config)}</span>
                </td>
                <td
                  aria-hidden="true"
                  className="hidden w-32 shrink-0 truncate text-right text-muted tabular-nums sm:block"
                >
                  {count(min)}–{count(max)} B
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="flex gap-2">
        <span className="w-28 shrink-0" />
        <div aria-hidden="true" className="relative h-4 flex-1 border-border-strong border-t">
          {MARKS.map((m, i) => (
            <span
              key={m}
              className={cx(
                'absolute top-0.5 text-muted text-panel-status tabular-nums',
                i === 0 ? '' : i === MARKS.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
              )}
              style={{ left: at(m) }}
            >
              {kb(m)}
            </span>
          ))}
        </div>
        <span className="hidden w-32 shrink-0 text-right text-muted text-panel-status sm:block">
          bytes
        </span>
      </div>
    </div>
  )
}
