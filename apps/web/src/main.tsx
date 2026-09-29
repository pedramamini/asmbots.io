import './styles.css'
import { initTheme } from '@asmbots/ui'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { armBoot } from './app/boot/boot'
import { ErrorBoundary } from './app/ErrorPage'
import { armStaleChunkReload } from './app/stale-chunk'
import { createAppRouter, createQueryClient } from './router'

// A tab from before the last deploy asks for chunks that no longer exist: reload it once.
armStaleChunkReload()

// index.html's boot script has applied the theme already; this covers a page without it (tests).
initTheme()

// Opening the site at `/` boots the core first (`app/boot`): decided before the first render.
armBoot()

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)

const root = document.getElementById('root')
if (root === null) throw new Error('index.html has no #root')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
