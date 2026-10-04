/** A bot's name in the picker, a card's or a table row's: a press shows its source. */
export function SourceButton({
  name,
  onClick,
  untabbed,
}: {
  name: string
  onClick: () => void
  /**
   * Out of the Tab order, as on a card, whose one stop is `+` (PRODUCT_SPEC §2): a pointer and a
   * screen reader still reach it, and the table view's names keep their stops.
   */
  untabbed?: boolean | undefined
}) {
  return (
    <button
      type="button"
      title={`view the source of ${name}`}
      className="min-w-0 truncate rounded-sm text-left text-bright decoration-accent underline-offset-2 hover:underline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent"
      onClick={onClick}
      {...(untabbed === true && { tabIndex: -1 })}
    >
      {name}
    </button>
  )
}
