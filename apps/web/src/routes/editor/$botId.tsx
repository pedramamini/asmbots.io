import { loadLargeImages, loadLargeSources } from '@asmbots/bots'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeading } from '../../app/PageHeading'
import { titleHead } from '../../app/title'
import { EditorBotRoute } from '../../features/editor/EditorRoutes'

export const Route = createFileRoute('/editor/$botId')({
  // A bot of this browser by id, or a roster bot, read-only: `/editor/roster-dwarf`.
  head: ({ params }) => titleHead('editor', params.botId),
  // The roster bots past lightweight load first: the page lists the roster and opens its sources.
  // Offline, it has the lightweight bots.
  loader: () => Promise.all([loadLargeImages(), loadLargeSources()]).catch(() => {}),
  component: EditorDetail,
})

function EditorDetail() {
  return (
    <>
      <PageHeading>editor</PageHeading>
      <EditorBotRoute />
    </>
  )
}
