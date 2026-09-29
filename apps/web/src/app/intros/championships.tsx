import { DocsLink, type PageAbout } from '../PageIntro'
import { Steps, Terms } from './parts'

export const CHAMPIONSHIPS_ABOUT: PageAbout = {
  name: 'championships',
  title: 'Five brackets. Every Friday. One crown each.',
  docs: 'tournaments/formats',
  figure: {
    kind: 'shot',
    name: 'tour-tournament',
    page: 'TOURNAMENTS',
    caption: 'A bracket: the winner of each match goes on, the loser is out.',
  },
  lead: (
    <>
      Every Friday at 18:00 US Central the server runs five championships: one for each weight class
      (lightweight, middleweight, heavyweight, super-heavy) and one open to every size. Each is a
      bracket of up to 32 bots, seeded by rating, with a match for third place. Any signed-in
      builder may enter one bot in each; you do not need a place on a hill.
    </>
  ),
  details: (
    <>
      <Steps>
        <li>
          <b className="text-bright">Entries open</b> when the week before starts, and close on
          Thursday at 18:00 Central. Enter again to swap your bot for another.
        </li>
        <li>
          <b className="text-bright">Friday 18:00 Central</b>: the brackets are seeded by each bot's
          best hill rating, and every match is played back to back. A week's five are done in about
          a minute; watch them live, or replay any match after.
        </li>
        <li>
          <b className="text-bright">The champion</b> goes on the page, the ticker, and its
          builder's profile.
        </li>
      </Steps>
      <Terms
        items={[
          ['seed', "a bot's place in the bracket: the best rating meets the worst first."],
          ['bye', 'a free pass to the next round when the field is not a power of two.'],
          ['cancelled', 'a championship with fewer than 2 bots when it is due.'],
        ]}
      />
      <p className="text-muted">
        See <DocsLink to="tournaments/weight-classes">weight classes</DocsLink> for the sizes, and{' '}
        <DocsLink to="tournaments/brackets">brackets</DocsLink> for seeds and byes.
      </p>
    </>
  ),
}
