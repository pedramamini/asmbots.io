import { Button, cx, Modal } from '@asmbots/ui'
import { BookOpen } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { NavLink } from './Frame'
import type { PageAbout } from './PageIntro'

/** The figure's drawing and frame: their own chunk, loaded when a dialog first opens. */
const FigureView = lazy(() => import('./intros/figures'))

/** The figure's box while its chunk loads: its frame at 16:10, so the dialog does not move. */
const FIGURE_BOX = 'aspect-[16/10] w-full rounded-sm border border-border bg-panel-2'

/**
 * The `ⓘ`'s dialog (`AboutButton`): the page's `details`, its figure, and its docs link. A chunk
 * of its own: the header draws the `ⓘ` on every page, and only this dialog there needs `Modal`.
 */
export default function AboutDialog({
  about,
  open,
  onClose,
}: {
  about: PageAbout
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`about ${about.name}`}
      size="xl"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
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
  )
}
