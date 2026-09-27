import { DocsLink, type PageAbout } from '../PageIntro'
import { Steps, Terms } from './parts'

export const TOURNAMENTS_ABOUT: PageAbout = {
  name: 'tournaments',
  title: 'Pick a field. Run the bracket. Crown a champion.',
  docs: 'tournaments/formats',
  lead: (
    <>
      A tournament is a one-time event that ends with a champion; a hill never ends. Pick any bots
      and a format: a round robin (every bot fights every other bot), a bracket (lose a match and
      you are out), or a melee (every bot in one core). It runs here, in your browser, and a link
      shares it. Every Friday at 18:00 US Central the server runs the weekly championship: a bracket
      of up to 32 lightweight bots, seeded by rating. Sign in and enter one of yours.
    </>
  ),
  details: (
    <>
      <p>
        A tournament is made of matches, and a match is a set of rounds with the same bots. Each
        round uses the next seed and rotates the bot order, so no bot always goes first.
      </p>
      <Terms
        items={[
          ['round robin', 'every bot fights every other bot once. The fairest, and the slowest.'],
          ['bracket', 'single elimination: the loser of a match is out. The final crowns it.'],
          ['melee', 'all the bots share one core, every round.'],
        ]}
      />
      <Steps>
        <li>
          <b className="text-bright">New tournament</b>: give it a name and a kind, pick the bots,
          and pick a config or a preset.
        </li>
        <li>
          <b className="text-bright">Run it</b>. Matches play one at a time in the background. The
          tournament saves after every match, so a reload goes on from where it stopped.
        </li>
        <li>
          <b className="text-bright">Watch</b> any match in the arena, or share the tournament as a
          link.
        </li>
      </Steps>
      <p className="text-muted">
        Cards with the <code>server</code> chip run on the server. The weekly championship starts
        every Friday at 18:00 US Central: sign in and <code>enter</code> one of your bots. See{' '}
        <DocsLink to="tournaments/brackets">brackets</DocsLink> for seeds and byes.
      </p>
    </>
  ),
}
