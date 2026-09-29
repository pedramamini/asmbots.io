/**
 * The new bot's empty state (PRODUCT_SPEC §3): while `/editor` holds the blank template as it
 * comes, or no text, the templates menu opens as a modal, centered over the dimmed page. A template
 * starts the bot from it; `start on your own`, `close`, Escape, or a press on the overlay puts the
 * modal away and leaves the text.
 */
import { Button, cx, Modal } from '@asmbots/ui'
import { useId } from 'react'
import { TEMPLATES, type TemplateId } from './templates'

export interface EmptyEditorProps {
  /** A template, picked: the page starts the bot from it. */
  onTemplate: (id: TemplateId) => void
  /** `start on your own`, `close`, Escape, or the overlay: the page keeps the text. */
  onClose: () => void
}

/**
 * A template's row: the menu's item, with what the template is beside its name. The keyboard's
 * focus takes the kit's ring, inset, so it stays clear of the rows beside it.
 */
const ROW = cx(
  'flex h-7 w-full items-center gap-3 rounded-sm px-2 text-left text-data transition-colors duration-120 ease-out',
  'hover:bg-accent-10 focus-visible:bg-accent-10 focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-accent',
)

export function EmptyEditor({ onTemplate, onClose }: EmptyEditorProps) {
  const id = useId()
  return (
    <Modal
      open
      onClose={onClose}
      title="new bot"
      actions={
        <Button variant="primary" onClick={onClose}>
          start on your own
        </Button>
      }
    >
      <p className="text-muted">start from a template, or on your own from the blank bot.</p>
      <ul aria-label="templates" className="mt-2 flex flex-col">
        {TEMPLATES.map((template) => (
          <li key={template.id} className="relative">
            <button
              type="button"
              aria-describedby={`${id}-${template.id}`}
              onClick={() => onTemplate(template.id)}
              className={ROW}
            >
              <span className="w-36 shrink-0 text-accent-fg">{template.label}</span>
            </button>
            {/* Over the button's second column, not in it: the name is the visible text of the
                button (WCAG 2.5.3), and this describes it. A press goes through to the button. */}
            <span
              id={`${id}-${template.id}`}
              className="pointer-events-none absolute top-1/2 right-2 left-41 -translate-y-1/2 truncate text-data text-muted"
            >
              {template.detail}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
