import { Button } from '@asmbots/ui'
import { Plus } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import type { Assemble } from './bots'
import { Diagnostics } from './Diagnostics'

/**
 * Raw source, pasted: assembled as it changes, its errors listed under the box, and `add` once it
 * assembles, which saves it to my bots and picks it.
 */
export function PasteBox({
  full,
  assemble,
  onAdd,
}: {
  full: boolean
  /** Null while the assembler loads. */
  assemble: Assemble | null
  /** Resolves false when the bot was refused, so its text stays. */
  onAdd: (name: string, source: string, size: number) => Promise<boolean>
}) {
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  const deferred = useDeferredValue(text)
  const blank = deferred.trim() === ''
  const assembled = blank || assemble === null ? null : assemble(deferred)
  const errors = assembled?.diagnostics.filter((d) => d.severity === 'error') ?? []
  const ok = assembled !== null && errors.length === 0 && deferred === text
  return (
    <div className="flex flex-col gap-2">
      <textarea
        aria-label="bot source"
        placeholder={'%name "my bot"\n\nstart:  jmp start'}
        spellCheck={false}
        rows={14}
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        className="w-full resize-y rounded-sm border border-border bg-panel-2 p-2 text-code text-text outline-hidden transition-colors duration-120 ease-out placeholder:text-dim hover:border-border-strong focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-data text-muted">
          {assembled === null
            ? blank
              ? 'paste x16c source: a %name line, then the code.'
              : 'loading the assembler…'
            : errors.length > 0
              ? `${errors.length} ${errors.length === 1 ? 'error' : 'errors'}`
              : `${assembled.name} · ${assembled.bytes.length} B`}
        </p>
        <Button
          variant="primary"
          icon={Plus}
          disabled={!ok || full}
          loading={adding}
          onClick={async () => {
            if (assembled === null) return
            setAdding(true)
            try {
              if (await onAdd(assembled.name, text, assembled.bytes.length)) setText('')
            } finally {
              setAdding(false)
            }
          }}
        >
          add
        </Button>
      </div>
      {assembled !== null && errors.length > 0 && (
        <Diagnostics source={deferred} diagnostics={errors} />
      )}
    </div>
  )
}
