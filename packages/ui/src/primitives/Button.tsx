import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { CONTROL_BOX, CONTROL_SIZE, DISABLED, drawIcon, FOCUS_RING, IDLE } from '../control'
import { cx } from '../style'

/** `default` is the bordered `REFRESH`; `ghost` is the bare `clear` of the filter row. */
export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'

const VARIANT: Readonly<Record<ButtonVariant, string>> = {
  default: IDLE,
  primary: 'border-accent bg-accent-10 text-accent-fg not-disabled:hover:bg-accent-25',
  ghost: 'border-transparent text-muted not-disabled:hover:text-text',
  danger: 'border-danger text-danger not-disabled:hover:bg-danger/10',
}

/**
 * The label's type: nav type, calm data type for a ghost. At lg, the modal title's from `sm` up; a
 * phone keeps nav type so `FIGHT · 16 BOTS · 10 ROUNDS` still fits on one line.
 */
function typeOf(variant: ButtonVariant, size: 'sm' | 'md' | 'lg'): string {
  if (size === 'lg') return 'text-nav sm:text-modal-title'
  return variant === 'ghost' ? 'text-data' : 'text-nav'
}

/** The three dots' stagger: each a third of the pulse after the one before. */
const DOT_DELAY = ['', '[animation-delay:160ms]', '[animation-delay:320ms]'] as const

export interface ButtonProps extends ComponentProps<'button'> {
  /** `default`: hairline, muted. `primary`: accent. `ghost`: no border, lowercase. `danger`. */
  variant?: ButtonVariant | undefined
  /**
   * `md` is 24 px, the nav button's height; `sm` is 20 px, for dense rows; `lg` is 72 px in the
   * modal title's type, for the one call to action a page is built around (the arena's fight).
   */
  size?: 'sm' | 'md' | 'lg' | undefined
  /** A lucide icon before the label: 12 px, 20 px at `lg`. */
  icon?: LucideIcon | undefined
  /**
   * Working: three pulsing dots over the label, which keeps the button's width and name. The
   * button stays focusable and reports `aria-busy`; a click does nothing until it is done.
   */
  loading?: boolean | undefined
}

/**
 * A button (DESIGN_SYSTEM §4). Labels are UPPER in nav type (`REFRESH`, `FIGHT · 4 BOTS`); a ghost
 * button is a calm lowercase control (`clear`, `cancel`). It is `type="button"` unless told
 * otherwise, so it never submits a form by accident.
 */
export function Button({
  variant = 'default',
  size = 'md',
  icon,
  loading = false,
  type = 'button',
  onClick,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      {...rest}
      onClick={(event) => {
        // A busy button takes no click, and a busy submit button submits nothing.
        if (loading) event.preventDefault()
        else onClick?.(event)
      }}
      className={cx(
        CONTROL_BOX,
        CONTROL_SIZE[size],
        'relative',
        typeOf(variant, size),
        VARIANT[variant],
        FOCUS_RING,
        DISABLED,
        className,
      )}
    >
      {/* The label keeps its place (and the button its name) while the dots show over it. */}
      <span className={cx('inline-flex items-center gap-[inherit]', loading && 'opacity-0')}>
        {drawIcon(icon, size === 'lg' ? 20 : 12)}
        {children}
      </span>
      {loading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center gap-1"
        >
          {DOT_DELAY.map((delay) => (
            <span
              key={delay}
              className={cx(
                'size-1 bg-current animate-dot-pulse motion-reduce:animate-none',
                delay,
              )}
            />
          ))}
        </span>
      )}
    </button>
  )
}
