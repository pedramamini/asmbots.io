import { Button, cx, IconButton, Modal } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { BookOpen, Info } from 'lucide-react'
import { lazy, type ReactNode, Suspense, useState } from 'react'
import { NavLink } from './Frame'
import { useRouteAbout } from './slots'

/** What a page says about itself: a line at its top, and more behind the `ⓘ`. */
export interface PageAbout {
  /** The page's name, as the `ⓘ` and its dialog say it: `hills`. */
  readonly name: string
  /** The bold line over the lead, as the docs home's: `Submit a bot. Climb the hill. Be the king.` */
  readonly title: string
  /** The line at the top of the page: what the page is, in a sentence or two. */
  readonly lead: ReactNode
  /** The dialog's body: how the page works. */
  readonly details: ReactNode
  /** The docs page that says it all, under `/docs/`: `tournaments/hills`. */
  readonly docs: string
  /** The dialog's picture, beside its text: a screenshot of a page, or a diagram. */
  readonly figure?: AboutFigure | undefined
}

/**
 * An intro dialog's picture. `shot`: a screenshot in the reader's theme (`app/shots.ts`), framed as
 * a window of `page`. `diagram`: one of the drawings in `intros/figures.tsx`. The caption says
 * what it shows, so the drawing itself is art (DESIGN_SYSTEM §10).
 */
export type AboutFigure =
  | {
      readonly kind: 'shot'
      readonly name: string
      readonly page: string
      readonly caption: string
    }
  | {
      readonly kind: 'diagram'
      readonly name: 'hill' | 'match' | 'versions' | 'badges'
      readonly caption: string
    }

/** The figure's drawing and frame: their own chunk, loaded when a dialog first opens. */
const FigureView = lazy(() => import('./intros/figures'))

/** The figure's box while its chunk loads: its frame at 16:10, so the dialog does not move. */
const FIGURE_BOX = 'aspect-[16/10] w-full rounded-sm border border-border bg-panel-2'

/** A link inside an intro's text: underlined, as a link in running text is (DESIGN_SYSTEM §8). */
const INTRO_LINK =
  'rounded-sm text-accent-fg underline underline-offset-2 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent'

export interface PageIntroProps {
  about: PageAbout
  /**
   * The section's banner at the right end (DESIGN_SYSTEM §10): an `IntroArt`. The intro stands
   * as tall as the docs home's banner for it from `md` on.
   */
  art?: ReactNode
  /** More under the lead, in the text's column: the arena's battle kinds. */
  more?: ReactNode
  /** More classes for the box, which spans the page's 12 columns. */
  className?: string | undefined
}

/**
 * The top of a page that explains itself: the page's `title` in bold over its `lead`, and its `ⓘ`
 * in the header beside the page's name, which opens a dialog with its `details` and a link to its
 * docs. It sits in the page's `PanelGrid`. The title is not a heading: the page's `<h1>` is its
 * name (`PageHeading`).
 */
export function PageIntro({ about, art, more, className }: PageIntroProps) {
  useRouteAbout(about)
  return (
    <section
      aria-label={`about ${about.name}`}
      className={cx(
        'col-span-12 flex items-center gap-6 rounded-md border border-border bg-panel px-3 py-2',
        art != null && 'md:min-h-42',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 py-1">
        <p className="text-modal-title text-bright">{about.title}</p>
        <p className="text-body text-muted">{about.lead}</p>
        {more}
      </div>
      {art}
    </section>
  )
}

/**
 * The `ⓘ`, which the header draws beside the page's name (`useRouteAbout`): it opens the dialog
 * with the page's `details` and its docs link.
 */
export function AboutButton({ about }: { about: PageAbout }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <IconButton
        icon={Info}
        label={`about ${about.name}`}
        size="sm"
        onClick={() => setOpen(true)}
      />
      <Modal
        open={open}
        onClose={close}
        title={`about ${about.name}`}
        size="xl"
        actions={
          <>
            <Button variant="ghost" onClick={close}>
              close
            </Button>
            <NavLink to="/docs/$" params={{ _splat: about.docs }} icon={BookOpen}>
              read the docs
            </NavLink>
          </>
        }
      >
        <div
          className={cx(
            'grid gap-5 text-body text-text',
            about.figure && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]',
          )}
        >
          <div className="flex min-w-0 flex-col gap-3">{about.details}</div>
          {about.figure && (
            <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
              <Suspense fallback={<div className={FIGURE_BOX} />}>
                <FigureView figure={about.figure} />
              </Suspense>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

/** A link to a docs page inside an intro's details. */
export function DocsLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to="/docs/$" params={{ _splat: to }} className={INTRO_LINK}>
      {children}
    </Link>
  )
}
