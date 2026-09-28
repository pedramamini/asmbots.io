/**
 * Fuzzy search over labeled items: the command palette's and a filtered menu's. Its own module, so
 * a menu takes the ranking without the palette's dialog.
 */

/** What a search reads: the label first, then the group and keywords. */
export interface Searchable {
  readonly label: string
  readonly group?: string | undefined
  readonly keywords?: string | undefined
}

/**
 * The commands that match every word of `query`, the best first; an empty search keeps them all
 * in their order. A word matches strictly as a substring, or as letters that each start a word
 * (`gtar` finds `go to arena`), in the command's label, group, or keywords. Only when no command
 * matches strictly do loose matches count: the letters in order anywhere (`scnl` finds
 * `scanlines`). A match scores more where its letters run together or start words, more again in
 * the label, and most as a whole substring. Equal scores keep the list's order.
 */
export function filterCommands<T extends Searchable>(commands: readonly T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [...commands]
  const texts = commands.map((command) => ({
    command,
    label: command.label.toLowerCase(),
    rest: `${command.group ?? ''} ${command.keywords ?? ''}`.toLowerCase(),
  }))
  const ranked = (strict: boolean) =>
    texts
      .map(({ command, label, rest }) => ({
        command,
        score: words.reduce(
          (sum, word) =>
            sum +
            Math.max(fuzzyScore(word, label, strict) + LABEL_BONUS, fuzzyScore(word, rest, strict)),
          0,
        ),
      }))
      .filter(({ score }) => score > Number.NEGATIVE_INFINITY)
      .sort((a, b) => b.score - a.score)
      .map(({ command }) => command)
  const strict = ranked(true)
  return strict.length > 0 ? strict : ranked(false)
}

/** A word's score in its command's label, over the same match in its group or keywords. */
const LABEL_BONUS = 4
/** A letter that starts a word of the text. */
const START_BONUS = 8
/** A letter right after the one before it. */
const RUN_BONUS = 6
/** A gap between two letters. */
const GAP_COST = 3

/**
 * How well `word`'s letters, in order, match `text`: the best placement's score, higher for runs,
 * word starts, and a whole substring; minus infinity when they do not all appear in order. When
 * `strict`, a letter that does not follow the one before it must start a word, unless the word is
 * a substring of the text.
 */
export function fuzzyScore(word: string, text: string, strict = false): number {
  if (word.length === 0) return 0
  const substring = text.includes(word)
  const loose = !strict || substring
  // best[j]: the best score with the word's letters so far placed, the last at text[j].
  let best: number[] = []
  for (let i = 0; i < word.length; i++) {
    const next: number[] = new Array(text.length).fill(Number.NEGATIVE_INFINITY)
    /** The best of best[0..j-2]: a letter placed with a gap before this one. */
    let gapped = Number.NEGATIVE_INFINITY
    for (let j = 0; j < text.length; j++) {
      if (i > 0 && j >= 2) gapped = Math.max(gapped, best[j - 2] ?? Number.NEGATIVE_INFINITY)
      if (text[j] !== word[i]) continue
      const start = j === 0 || !/[a-z0-9]/.test(text[j - 1] ?? '')
      const letter = 1 + (start ? START_BONUS : 0)
      const jump = loose || start ? (i === 0 ? 0 : gapped - GAP_COST) : Number.NEGATIVE_INFINITY
      const run =
        i === 0 ? Number.NEGATIVE_INFINITY : (best[j - 1] ?? Number.NEGATIVE_INFINITY) + RUN_BONUS
      next[j] = letter + Math.max(run, jump)
    }
    best = next
  }
  const score = Math.max(Number.NEGATIVE_INFINITY, ...best)
  return substring ? score + 2 * word.length : score
}
