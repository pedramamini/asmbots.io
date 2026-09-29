import { type EditorLayout, type EditorLayoutTree, MAX_EDITOR_LAYOUTS } from '@asmbots/protocol'
import { Button, cx, EmptyState, IconButton, Input, Modal, useToast } from '@asmbots/ui'
import { Check, Pencil, Save, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ApiRequestError } from '../../api/client'
import { useEditorLayoutActions, useEditorLayouts } from '../../api/queries'
import { ago } from '../hills/links'
import { LayoutThumb } from './layout/LayoutThumb'
import { type Layout, sanitizeLayout } from './layout/tree'

export interface LayoutsModalProps {
  open: boolean
  onClose: () => void
  /** The layout on the page now: what `save` keeps. */
  current: Layout
  /** Puts a kept layout on the page, by its name. */
  onApply: (layout: Layout, name: string) => void
}

/** Why a request failed, as a toast says it. */
function why(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : 'try again'
}

/** `layout` as the API keeps it: its tree as plain JSON, which the API checks only for shape. */
function asTree(layout: Layout): EditorLayoutTree {
  return JSON.parse(JSON.stringify(layout))
}

/** A layout as JSON with its weights to 4 places: two that draw alike read the same. */
function fingerprint(layout: Layout): string {
  return JSON.stringify(layout, (_, value: unknown) =>
    typeof value === 'number' ? Math.round(value * 1e4) / 1e4 : value,
  )
}

/**
 * `layouts` (PRODUCT_SPEC §3): the signed-in user's editor layouts, kept in their account, so a
 * layout made once comes back by name on any device. The layout on the page is kept under a name
 * (the name of one kept replaces it); each kept one shows in little, and loads, takes the layout on
 * the page in its place, renames, or deletes (asked twice). The one the page shows is marked.
 */
export function LayoutsModal({ open, onClose, current, onApply }: LayoutsModalProps) {
  const layouts = useEditorLayouts()
  const { save, update, remove } = useEditorLayoutActions()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!open) return
    setName('')
    setRenaming(null)
    setDeleting(null)
  }, [open])

  const list = layouts.data?.layouts
  const trimmed = name.trim()
  const named = list?.find((l) => l.name.toLowerCase() === trimmed.toLowerCase())
  const full = list !== undefined && list.length >= MAX_EDITOR_LAYOUTS && named === undefined
  const shown = fingerprint(current)

  const submit = async () => {
    if (trimmed === '' || full || save.isPending) return
    try {
      const { created } = await save.mutateAsync({ name: trimmed, layout: asTree(current) })
      toast(`${created ? 'saved' : 'replaced'} layout ${trimmed}.`, { variant: 'accent' })
      setName('')
    } catch (error) {
      toast(`could not save the layout: ${why(error)}.`, { variant: 'danger' })
    }
  }

  const apply = (kept: EditorLayout) => {
    const layout = sanitizeLayout(kept.layout)
    if (layout === null) {
      toast(`layout ${kept.name} is not one this editor reads.`, { variant: 'danger' })
      return
    }
    onApply(layout, kept.name)
    onClose()
  }

  const overwrite = async (kept: EditorLayout) => {
    try {
      await update.mutateAsync({ id: kept.id, update: { layout: asTree(current) } })
      toast(`layout ${kept.name} is now the one on screen.`, { variant: 'accent' })
    } catch (error) {
      toast(`could not save the layout: ${why(error)}.`, { variant: 'danger' })
    }
  }

  const rename = async (kept: EditorLayout, to: string) => {
    const next = to.trim()
    if (next === '' || next === kept.name) {
      setRenaming(null)
      return
    }
    try {
      await update.mutateAsync({ id: kept.id, update: { name: next } })
      setRenaming(null)
    } catch (error) {
      toast(`could not rename the layout: ${why(error)}.`, { variant: 'danger' })
    }
  }

  const drop = async (kept: EditorLayout) => {
    try {
      await remove.mutateAsync(kept.id)
      toast(`deleted layout ${kept.name}.`)
    } catch (error) {
      toast(`could not delete the layout: ${why(error)}.`, { variant: 'danger' })
    }
    setDeleting(null)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="layouts"
      size="lg"
      actions={
        <Button variant="ghost" onClick={onClose}>
          close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <form
          aria-label="save the layout"
          className="flex gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <LayoutThumb layout={current} className="border-accent-45" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-panel-status text-muted">the layout on screen</p>
            <div className="flex items-center gap-2">
              <Input
                ref={nameInput}
                aria-label="layout name"
                className="min-w-0 flex-1"
                placeholder="name it: wide debug"
                maxLength={40}
                autoComplete="off"
                spellCheck={false}
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
              <Button
                type="submit"
                variant="primary"
                icon={Save}
                loading={save.isPending}
                disabled={trimmed === '' || full}
              >
                {named === undefined ? 'save' : 'replace'}
              </Button>
            </div>
            <p
              className={cx('text-data', named === undefined && !full ? 'text-muted' : 'text-warn')}
            >
              {full
                ? `you keep ${MAX_EDITOR_LAYOUTS} layouts: delete one to save another.`
                : named !== undefined
                  ? `replaces ${named.name}.`
                  : `kept in your account, on every device you sign in on${
                      list === undefined ? '' : ` · ${list.length} of ${MAX_EDITOR_LAYOUTS}`
                    }.`}
            </p>
          </div>
        </form>
        {layouts.isError ? (
          <p role="alert" className="text-danger">
            could not load your layouts: {layouts.error.message}
          </p>
        ) : list === undefined ? (
          <p className="text-muted">reading your layouts…</p>
        ) : list.length === 0 ? (
          <EmptyState
            dense
            action={{ label: 'name this one', onClick: () => nameInput.current?.focus() }}
          >
            no layouts kept yet.
          </EmptyState>
        ) : (
          <ul
            aria-label="your layouts"
            className="flex max-h-[50vh] flex-col divide-y divide-border overflow-y-auto"
          >
            {list.map((kept) => {
              const layout = sanitizeLayout(kept.layout)
              const onScreen = layout !== null && fingerprint(layout) === shown
              return (
                <li key={kept.id} className="flex items-center gap-3 py-2">
                  <button
                    type="button"
                    aria-label={`load ${kept.name}`}
                    onClick={() => apply(kept)}
                    className="rounded-sm transition-opacity duration-120 ease-out hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {layout === null ? (
                      <span className="flex h-12 w-20 items-center justify-center rounded-sm border border-border text-muted">
                        ?
                      </span>
                    ) : (
                      <LayoutThumb layout={layout} className={onScreen ? 'border-accent' : ''} />
                    )}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col">
                    {renaming === kept.id ? (
                      <RenameField
                        name={kept.name}
                        pending={update.isPending}
                        onDone={(to) => void rename(kept, to)}
                        onCancel={() => setRenaming(null)}
                      />
                    ) : (
                      <span className="truncate font-medium text-text">{kept.name}</span>
                    )}
                    <span className="text-data text-muted">
                      {onScreen ? (
                        <span className="text-accent-fg">on screen</span>
                      ) : (
                        `saved ${ago(kept.updatedAt)}`
                      )}
                    </span>
                  </div>
                  {deleting === kept.id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-warn">delete it?</span>
                      <Button
                        variant="danger"
                        loading={remove.isPending}
                        onClick={() => void drop(kept)}
                      >
                        delete
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleting(null)}>
                        keep
                      </Button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Button icon={Upload} onClick={() => apply(kept)}>
                        load
                      </Button>
                      <IconButton
                        icon={Save}
                        label={`save the layout on screen as ${kept.name}`}
                        disabled={onScreen || update.isPending}
                        onClick={() => void overwrite(kept)}
                      />
                      <IconButton
                        icon={Pencil}
                        label={`rename ${kept.name}`}
                        onClick={() => setRenaming(kept.id)}
                      />
                      <IconButton
                        icon={Trash2}
                        label={`delete ${kept.name}`}
                        onClick={() => setDeleting(kept.id)}
                      />
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

/** A kept layout's name, in place, to change: enter keeps it, escape leaves it as it was. */
function RenameField({
  name,
  pending,
  onDone,
  onCancel,
}: {
  name: string
  pending: boolean
  onDone: (to: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(name)
  return (
    <form
      aria-label={`rename ${name}`}
      className="flex items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault()
        onDone(value)
      }}
    >
      <Input
        aria-label="new name"
        className="min-w-0 flex-1"
        maxLength={40}
        autoComplete="off"
        spellCheck={false}
        autoFocus
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          // Escape leaves the name as it was; the dialog stays.
          event.stopPropagation()
          event.preventDefault()
          onCancel()
        }}
      />
      <IconButton icon={Check} label="keep the name" type="submit" disabled={pending} />
      <IconButton icon={X} label="cancel" onClick={onCancel} />
    </form>
  )
}
