import { createFileRoute, notFound } from '@tanstack/react-router'
import { DocsArticle } from '../../app/DocsFrame'
import { titleHead } from '../../app/title'
import { MDX_COMPONENTS } from '../../docs/components'

export const Route = createFileRoute('/docs/$')({
  // The page's MDX loads before the route shows, and on intent from a sidebar link. The docs' nav
  // loads with it: this file is in the entry chunk, and a static import put it on every page.
  loader: async ({ params }) => {
    const { findDoc } = await import('../../docs')
    const page = findDoc(params._splat)
    if (page === undefined) throw notFound()
    const { default: Content } = await page.load()
    return { slug: page.slug, title: page.title, Content }
  },
  head: ({ loaderData, params }) => titleHead('docs', loaderData?.title ?? params._splat),
  component: DocsPage,
})

function DocsPage() {
  const { slug, title, Content } = Route.useLoaderData()
  return (
    <DocsArticle title={title} slug={slug}>
      <Content components={MDX_COMPONENTS} />
    </DocsArticle>
  )
}
