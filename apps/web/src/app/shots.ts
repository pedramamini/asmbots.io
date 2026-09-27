import { DEFAULT_THEME, type Theme } from '@asmbots/ui/themes'
import { useSettings } from '../store/settings'

/**
 * Where the screenshots are served (`e2e/docs-shots.spec.ts` takes them), 1280 × 800 each: one per
 * theme, so a shot looks like the page around it. The default theme's is `<name>.webp`, the path
 * the agent docs and every link use; another theme's is `<name>.<theme>.webp`.
 */
export const SHOT_PATH = '/docs-shots/'

/** The file of shot `name` in `theme`. */
export function shotSrc(name: string, theme: Theme = DEFAULT_THEME): string {
  return `${SHOT_PATH}${name}${theme === DEFAULT_THEME ? '' : `.${theme}`}.webp`
}

/** The file of shot `name` in the reader's theme. */
export function useShotSrc(name: string): string {
  return shotSrc(
    name,
    useSettings((state) => state.theme),
  )
}
