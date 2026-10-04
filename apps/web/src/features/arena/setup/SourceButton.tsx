/** A bot's name in the picker, a card's or a table row's: a press shows its source. */
export function SourceButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={`view the source of ${name}`}
      className="min-w-0 truncate rounded-sm text-left text-bright decoration-accent underline-offset-2 hover:underline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent"
      onClick={onClick}
    >
      {name}
    </button>
  )
}
