import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { Framed } from '../components/PageFrame'
import { Sections } from '../components/home/Sections'
import { useStorefront, useTitle } from '../lib'
import NotFound from './NotFound'

/** A page written in Admin → Storefront. Its shape is the sections added there. */
export default function InfoPage() {
  const { slug } = useParams()
  const { pick, tx } = useI18n()
  const page = useStorefront().pages.find((p) => p.slug === slug && p.published)
  useTitle(page ? pick(page.title) : undefined)
  if (!page) return <Framed id="missing"><NotFound /></Framed>
  const title = pick(page.title)
  const body = pick(page.body)
  const blocks = page.blocks.filter((b) => b.enabled)
  if (page.layout === 'sections' && blocks.length) {
    return (
      <div className="v-home">
        <h1 className="sr-only">{title}</h1>
        <Sections blocks={page.blocks} hold={0} />
      </div>
    )
  }
  return (
    <>
      <div className="sf-wrap sf-page">
        <nav className="sf-crumbs" aria-label={tx('مسار الصفحة', 'Breadcrumb')}>
          <Link to="/">{tx('الرئيسية', 'Home')}</Link>
          <span aria-current="page">{title}</span>
        </nav>
        {title && <h1 className="sf-display">{title}</h1>}
        {body && <div className="sf-prose">{body}</div>}
      </div>
      {blocks.length > 0 && (
        <div className="v-home">
          <Sections blocks={page.blocks} hold={0} />
        </div>
      )}
    </>
  )
}
