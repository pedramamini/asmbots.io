import { Button, cx, vars } from '@asmbots/ui'
import { applyTheme, THEMES, type Theme } from '@asmbots/ui/themes'
import { ChevronUp, Palette } from 'lucide-react'
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { useSettings } from '../../store/settings'
import { SWATCHES } from '../theme-swatches'

/**
 * The boot screen's `change theme`: a list of the themes that opens up over the button. Up and
 * Down (or a click) choose a theme at once, so the page behind shows it; the choice is stored
 * (`setTheme`, `localStorage.theme`). A pointer over a theme shows it without choosing it. Enter,
 * Escape, Tab, and a press outside close the list.
 */
export function ThemePicker({ className }: { className?: string }) {
  const theme = useSettings((state) => state.theme)
  const setTheme = useSettings((state) => state.setTheme)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const listId = useId()

  // A previewed theme goes back to the chosen one.
  const preview = (name: Theme | null) =>
    applyTheme(name ?? useSettings.getState().theme, { persist: false })

  const close = (focusTrigger: boolean) => {
    preview(null)
    setOpen(false)
    if (focusTrigger) trigger.current?.focus()
  }

  // Opening focuses the chosen theme.
  useEffect(() => {
    if (!open) return
    list.current?.querySelector<HTMLElement>('[aria-checked=true]')?.focus()
  }, [open])

  // A press outside closes it.
  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  })

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (step !== 0) {
      event.preventDefault()
      const at = THEMES.indexOf(useSettings.getState().theme)
      const next = THEMES[(at + step + THEMES.length) % THEMES.length] ?? theme
      setTheme(next)
      list.current?.querySelector<HTMLElement>(`[data-theme-option="${next}"]`)?.focus()
    } else if (event.key === 'Escape') {
      // The list's Escape, not the boot dialog's (which would enter the site).
      event.preventDefault()
      event.stopPropagation()
      close(true)
    } else if (event.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div ref={root} className={cx('relative', className)}>
      {open && (
        <div
          ref={list}
          id={listId}
          role="radiogroup"
          aria-label="theme"
          onKeyDown={onKeyDown}
          onPointerLeave={() => preview(null)}
          className="absolute inset-x-0 bottom-full z-10 mb-2 flex origin-bottom flex-col gap-0.5 rounded-md border border-border-strong bg-panel p-1 shadow-[0_-8px_24px_rgb(0_0_0/0.45)] transition-[opacity,translate,scale] duration-150 ease-out starting:translate-y-1 starting:scale-y-95 starting:opacity-0 motion-reduce:transition-none"
        >
          {THEMES.map((name) => (
            <ThemeOption
              key={name}
              theme={name}
              chosen={name === theme}
              onChoose={() => {
                setTheme(name)
                close(true)
              }}
              onPreview={() => preview(name)}
            />
          ))}
        </div>
      )}
      <Button
        ref={trigger}
        icon={Palette}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className="w-full justify-center border-border-strong! text-text!"
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        change theme
        <ChevronUp
          size={12}
          strokeWidth={1.75}
          aria-hidden="true"
          className={cx(
            'transition-transform duration-150 ease-out motion-reduce:transition-none',
            !open && 'rotate-180',
          )}
        />
      </Button>
    </div>
  )
}

/** One row: the theme's colors in a chip, its name, and a dot on the chosen one. */
function ThemeOption({
  theme,
  chosen,
  onChoose,
  onPreview,
}: {
  theme: Theme
  chosen: boolean
  onChoose: () => void
  onPreview: () => void
}) {
  const colors = SWATCHES[theme] ?? {}
  return (
    // biome-ignore lint/a11y/useSemanticElements: a picture of the theme, not a form field.
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      tabIndex={chosen ? 0 : -1}
      data-theme-option={theme}
      onClick={onChoose}
      onPointerEnter={onPreview}
      className={cx(
        'flex h-7 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-left text-data transition-colors duration-120 ease-out focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-accent',
        chosen ? 'bg-accent-10 text-accent-fg' : 'text-text hover:bg-accent-10',
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-3.5 w-7 shrink-0 items-center justify-end gap-0.5 rounded-xs border border-(--sw-border) bg-(--sw-bg) px-0.5"
        style={vars({
          '--sw-bg': colors['--bg'] ?? 'var(--bg)',
          '--sw-border': colors['--border'] ?? 'var(--border)',
          '--sw-text': colors['--text'] ?? 'var(--text)',
          '--sw-accent-fg': colors['--accent-fg'] ?? 'var(--accent-fg)',
        })}
      >
        <span className="size-1.5 rounded-full bg-(--sw-text)" />
        <span className="size-1.5 rounded-full bg-(--sw-accent-fg)" />
      </span>
      <span className="flex-1">{theme}</span>
      {chosen && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]"
        />
      )}
    </button>
  )
}
