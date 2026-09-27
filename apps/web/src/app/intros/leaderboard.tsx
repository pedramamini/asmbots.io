import type { PageAbout } from '../PageIntro'
import { Terms } from './parts'

export const LEADERBOARD_ABOUT: PageAbout = {
  name: 'leaderboard',
  title: 'Win matches. Earn badges. Top the board.',
  docs: 'tournaments/hills',
  lead: (
    <>
      Every builder ranked by the matches their bots win on the server, and the badges they have
      earned: the titles one builder holds at a time, and the milestones anyone can reach.
    </>
  ),
  details: (
    <>
      <p>
        The rank is match wins, then the hills held, then matches played. The house, whose bots are
        the roster, has a row and no rank or badges. Bot numbers and bot badges count public bots;
        matches, hills, and championships count every bot, since their results are public. The board
        is at most five minutes old.
      </p>
      <Terms
        items={[
          [
            'title',
            'a badge one builder holds: the best of one number on the site. Level builders share it.',
          ],
          ['milestone', 'a badge any builder earns by passing its line.'],
          ['kill', 'a duel round won by outliving the other bot.'],
          ['king', 'a bot at rank 1 on a hill now.'],
        ]}
      />
    </>
  ),
}
