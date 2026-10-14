import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '../../features/account/auth/AuthPage'

/**
 * The sign-in pages, one route for the five (`/auth/login`, `/auth/signup`, `/auth/forgot`,
 * `/auth/reset`, `/auth/verify`): this file is in the entry chunk, which every page loads, and
 * `/editor` has next to nothing left of its budget. So it says its path and no more: `AuthPage`,
 * in its own chunk, picks the page, reads `?returnTo=`, and titles the tab.
 */
export const Route = createFileRoute('/auth/$')({ component: AuthRoute })

function AuthRoute() {
  return <AuthPage page={Route.useParams()._splat ?? ''} />
}
