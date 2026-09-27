import { loadLargeImages } from '@asmbots/bots'
import { createFileRoute } from '@tanstack/react-router'
import { titleHead } from '../../../app/title'
import { validateArenaSearch } from '../../../features/arena/setup/search'
import { EmbedSetup } from '../../../features/embed/EmbedArena'

export const Route = createFileRoute('/embed/arena/')({
  // An arena link's query and fragment: `?b=roster:dwarf,roster:imp&seed=42#src=…`.
  validateSearch: validateArenaSearch,
  head: () => titleHead('embed'),
  // The roster bots past lightweight load first: the page lists the roster (`rosterCatalog`).
  // Offline, it lists the lightweight bots.
  loader: () => loadLargeImages().catch(() => {}),
  // Another site's `<iframe>`: the arena alone, no header, ticker, or status bar.
  staticData: { frame: false },
  component: EmbedSetupRoute,
})

function EmbedSetupRoute() {
  return <EmbedSetup />
}
