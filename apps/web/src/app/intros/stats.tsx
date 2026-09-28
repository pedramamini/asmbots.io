import type { PageAbout } from '../PageIntro'
import { Terms } from './parts'

export const STATS_ABOUT: PageAbout = {
  name: 'stats',
  title: 'Who plays. What they build. How it fights.',
  docs: 'machine/death',
  figure: {
    kind: 'diagram',
    name: 'match',
    caption:
      'A match is rounds of the same bots; a round is cycles, until a bot dies or the cycles run out.',
  },
  lead: (
    <>
      The site in numbers: who has signed up, the bots they build, and every match the server has
      fought on the hills and in tournaments, down to the last cycle.
    </>
  ),
  details: (
    <>
      <p>
        The server counts its own matches: hill challenges, tournaments, and the weekly
        championship. A battle you run in your browser, in the arena or the editor, stays in your
        browser and is not counted. The numbers are at most five minutes old.
      </p>
      <Terms
        items={[
          ['match', 'bots fought under one set of rules, for a number of rounds.'],
          ['round', 'one battle in a fresh core, until one bot is left or the cycles run out.'],
          ['death', 'a bot that died in a round: its last process ran a bad instruction.'],
          ['cycle', 'one tick of a battle: each living bot runs one instruction.'],
          [
            'weight class',
            'a band of bot sizes, from lightweight (1 to 512 bytes) to super-heavy.',
          ],
          ['crown', 'a challenger that took rank 1 on a hill.'],
        ]}
      />
    </>
  ),
}
